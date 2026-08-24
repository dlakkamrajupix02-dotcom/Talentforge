import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bot, Send, Sparkles, Database, BarChart2, PieChart, Activity, Download,
  Copy, Check, RefreshCw, ChevronDown, ChevronRight, Layers, Table,
  TrendingUp, TrendingDown, ArrowRight, ShieldCheck, Zap, AlertCircle,
  FileText, CornerDownLeft, Terminal, Cpu, Building2, Users, ShieldAlert,
  Printer, Code, ExternalLink, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, XAxis, YAxis,
  CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { superAdminAgentService } from '../../services/superAdminAgentService';
import TiltCard3D from '../../components/common/TiltCard3D';
import toast from 'react-hot-toast';

// Curated vibrant, modern high-contrast palette
const VIBRANT_PALETTE = [
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#a855f7', // Purple
  '#6366f1', // Indigo
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
  '#0284c7', // Sky
  '#f97316', // Orange
];

const exportToExcel = (message, filename = 'talentforge_analytics.xlsx') => {
  if (message?.excel_base64) {
    const byteCharacters = atob(message.excel_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = message.excel_filename || filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success('Excel downloaded (.xlsx)');
    return;
  }
  exportToCSV(message?.data, filename.replace('.xlsx', '.csv'));
};

const exportToCSV = (data, filename = 'superadmin_analytics.csv') => {
  if (!data || !data.length) {
    toast.error('No data available to export');
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csvRows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success('CSV downloaded successfully');
};

const exportToJSON = (data, filename = 'superadmin_analytics.json') => {
  if (!data || !data.length) {
    toast.error('No data available to export');
    return;
  }
  const jsonContent = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', jsonContent);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success('JSON downloaded successfully');
};

const printReport = (message) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow popups to print report');
    return;
  }

  const rows = message.data || [];
  const headers = message.columns || (rows.length ? Object.keys(rows[0]) : []);

  const tableHtml = rows.length ? `
    <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
      <thead>
        <tr style="background-color: #f1f5f9; text-align: left;">
          ${headers.map(h => `<th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 12px;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            ${headers.map(h => `<td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 12px;">${r[h] !== null ? r[h] : ''}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TalentForge Super Admin Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
          h1 { color: #4338ca; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          .summary { background: #f8fafc; border-left: 4px solid #6366f1; padding: 14px; margin: 16px 0; border-radius: 4px; }
          .meta { font-size: 11px; color: #64748b; margin-top: 4px; }
          .sql { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; white-space: pre-wrap; margin: 16px 0; }
        </style>
      </head>
      <body>
        <h1>TalentForge Super Admin AI Intelligence Briefing</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()} | Model: ${message.model_used || 'Mistral Codestral'}</div>
        <div class="summary">
          <strong>Executive Summary:</strong><br/>
          ${message.explanation || ''}
        </div>
        ${message.insights && message.insights.length ? `
          <h3>Actionable Insights:</h3>
          <ul>
            ${message.insights.map(i => `<li>${i}</li>`).join('')}
          </ul>
        ` : ''}
        ${message.sql_query ? `
          <h3>Executed SQL Query:</h3>
          <div class="sql">${message.sql_query}</div>
        ` : ''}
        <h3>Data Result (${rows.length} rows):</h3>
        ${tableHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: 14,
    color: '#f8fafc',
    fontSize: 12,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
  },
  itemStyle: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: 600
  },
  labelStyle: {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 12,
    marginBottom: 4
  }
};

// Dynamic Multi-Chart View Renderer with dynamic distinct per-item colors
function AnalyticsChartViewer({ chartType, data, config, columns }) {
  if (!data || !data.length) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
        No tabular records returned for graphical visualization.
      </div>
    );
  }

  // Sanitize numeric columns so strings like "48" are converted to numbers for Recharts
  const sanitizedData = useMemo(() => {
    return data.map(row => {
      const copy = { ...row };
      for (const key of Object.keys(copy)) {
        const val = copy[key];
        if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val.trim())) {
          copy[key] = parseFloat(val);
        }
      }
      return copy;
    });
  }, [data]);

  const xKey = config?.x_key || columns[0] || 'name';
  const numericColumns = useMemo(() => {
    if (!sanitizedData.length) return [];
    return columns.filter(c => c !== xKey && typeof sanitizedData[0]?.[c] === 'number');
  }, [columns, sanitizedData, xKey]);

  const yKeys = (config?.y_keys && config.y_keys.length)
    ? config.y_keys
    : numericColumns;

  const activeYKeys = yKeys.length ? yKeys : columns.slice(1, 3);
  const formatLabel = (key) => config?.labels?.[key] || key.replace(/_/g, ' ').toUpperCase();

  const isSingleSeries = activeYKeys.length === 1;

  return (
    <div className="w-full h-72 md:h-84 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'bar' && (
          <BarChart data={sanitizedData} margin={{ top: 15, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              angle={-20}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: 14,
                color: '#f8fafc',
                fontSize: 12,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
              }}
              cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
              itemStyle={{ color: '#e2e8f0', fontWeight: 600 }}
            />
            {!isSingleSeries && <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />}
            
            {isSingleSeries ? (
              <Bar dataKey={activeYKeys[0]} name={formatLabel(activeYKeys[0])} radius={[8, 8, 0, 0]}>
                {sanitizedData.map((entry, index) => (
                  <Cell
                    key={`bar-cell-${index}`}
                    fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]}
                  />
                ))}
              </Bar>
            ) : (
              activeYKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={formatLabel(key)}
                  fill={VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]}
                  radius={[6, 6, 0, 0]}
                />
              ))
            )}
          </BarChart>
        )}

        {chartType === 'line' && (
          <LineChart data={sanitizedData} margin={{ top: 15, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 11 }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
            {activeYKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={formatLabel(key)}
                stroke={VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]}
                strokeWidth={3}
                dot={{ r: 5, fill: VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length], stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            ))}
          </LineChart>
        )}

        {chartType === 'area' && (
          <AreaChart data={sanitizedData} margin={{ top: 15, right: 20, left: 0, bottom: 30 }}>
            <defs>
              {activeYKeys.map((key, idx) => {
                const color = VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length];
                return (
                  <linearGradient key={key} id={`dynamicAreaGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.5}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0.02}/>
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 11 }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
            {activeYKeys.map((key, idx) => {
              const color = VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length];
              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={formatLabel(key)}
                  stroke={color}
                  fillOpacity={1}
                  fill={`url(#dynamicAreaGrad_${idx})`}
                  strokeWidth={2.5}
                />
              );
            })}
          </AreaChart>
        )}

        {chartType === 'pie' && (
          <RechartsPie>
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Pie
              data={sanitizedData}
              dataKey={activeYKeys[0] || 'count'}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={50}
              paddingAngle={3}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={true}
            >
              {sanitizedData.map((entry, index) => (
                <Cell
                  key={`pie-cell-${index}`}
                  fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </RechartsPie>
        )}

        {chartType === 'radar' && (
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={sanitizedData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {activeYKeys.map((key, idx) => {
              const color = VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length];
              return (
                <Radar
                  key={key}
                  name={formatLabel(key)}
                  dataKey={key}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.35}
                />
              );
            })}
          </RadarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Interactive Paginated Table
function DataTableViewer({ data, columns }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 8;

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();
    return data.filter(row =>
      Object.values(row).some(v => v !== null && ('' + v).toLowerCase().includes(term))
    );
  }, [data, search]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="Search within table rows..."
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-64"
        />
        <span className="text-xs text-slate-400">
          Showing {paginated.length} of {filteredData.length} records
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 uppercase tracking-wider text-[10px]">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-3 whitespace-nowrap">{col.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-400">
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr key={idx} className="hover:bg-violet-50/30 transition-colors">
                  {columns.map(col => (
                    <td key={col} className="px-4 py-2.5 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                      {row[col] === null || row[col] === undefined ? (
                        <span className="text-slate-300 italic">null</span>
                      ) : typeof row[col] === 'boolean' ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row[col] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {row[col] ? 'true' : 'false'}
                        </span>
                      ) : (
                        '' + row[col]
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// Single AI Assistant Response Message Card
function AssistantMessageCard({ message }) {
  const [selectedChartType, setSelectedChartType] = useState(message.suggested_chart_type === 'table' || message.is_table_requested ? 'table' : (message.suggested_chart_type || 'bar'));
  const [isSqlOpen, setIsSqlOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    if (!message.sql_query) return;
    navigator.clipboard.writeText(message.sql_query);
    setCopied(true);
    toast.success('SQL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const hasData = message.data && message.data.length > 0;
  const columns = message.columns || (hasData ? Object.keys(message.data[0]) : []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-xl border border-violet-100 space-y-6 relative overflow-hidden"
    >
      {/* Top Header & Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm md:text-base">TalentForge Intelligence Engine</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-100 text-violet-700">
                <Sparkles size={10} /> {message.model_used || 'Mistral Codestral'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              SQL Executed in <span className="text-slate-600 font-semibold">{message.execution_time_ms || 0}ms</span> · Total <span className="text-slate-600 font-semibold">{message.total_time_ms || 0}ms</span> · <span className="text-slate-600 font-semibold">{message.row_count || (message.data?.length || 0)} rows</span>
            </p>
          </div>
        </div>

        {/* Export Toolbar */}
        {hasData && (
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
            <button
              onClick={() => exportToCSV(message.data, 'talentforge_superadmin_analytics.csv')}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-violet-700 hover:bg-white rounded-lg transition-all flex items-center gap-1"
              title="Download CSV"
            >
              <Download size={13} /> CSV
            </button>
            <button
              onClick={() => exportToJSON(message.data, 'talentforge_superadmin_analytics.json')}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-violet-700 hover:bg-white rounded-lg transition-all flex items-center gap-1"
              title="Download JSON"
            >
              <FileText size={13} /> JSON
            </button>
            <button
              onClick={() => printReport(message)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-violet-700 hover:bg-white rounded-lg transition-all flex items-center gap-1"
              title="Print / PDF Report"
            >
              <Printer size={13} /> Report
            </button>
          </div>
        )}
      </div>

      {/* Narrative Explanation */}
      {message.explanation && (
        <div className="bg-gradient-to-r from-violet-50/70 via-indigo-50/40 to-transparent p-4 rounded-2xl border border-violet-100/80 text-sm text-slate-700 leading-relaxed font-medium flex items-start gap-3">
          <Zap size={18} className="text-violet-600 shrink-0 mt-0.5" />
          <div>{message.explanation}</div>
        </div>
      )}

      {/* Real Data-Driven KPI Stat Cards */}
      {message.kpi_cards && message.kpi_cards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {message.kpi_cards.map((kpi, idx) => (
            <div key={idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                {kpi.label}
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className="text-lg font-black text-slate-800 tracking-tight">{kpi.value}</span>
                {kpi.change && (
                  <span className={`text-[11px] font-bold flex items-center gap-0.5 ${kpi.trend === 'down' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {kpi.trend === 'down' ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                    {kpi.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real Data-Driven Actionable Insights */}
      {message.insights && message.insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" /> Factual Data Analysis
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {message.insights.map((insight, idx) => (
              <div key={idx} className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart & Table Studio */}
      {hasData && (
        <div className="space-y-4 pt-2">
          {/* Chart Type Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/70">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'bar', label: 'Bar Chart', icon: BarChart2 },
                { id: 'area', label: 'Area Chart', icon: Activity },
                { id: 'line', label: 'Line Chart', icon: TrendingUp },
                { id: 'pie', label: 'Pie / Donut', icon: PieChart },
                { id: 'radar', label: 'Radar', icon: Layers },
                { id: 'table', label: 'Data Table', icon: Table },
              ].map(tab => {
                const Icon = tab.icon;
                const active = selectedChartType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedChartType(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                      active
                        ? 'bg-white text-violet-700 shadow-md shadow-violet-500/10 border border-violet-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-semibold text-slate-500 px-2">
              {message.chart_config?.title || 'Interactive Visual'}
            </span>
          </div>

          {/* Visual Canvas or Table */}
          <div className="bg-slate-50/40 rounded-2xl p-4 border border-slate-200/70">
            {selectedChartType === 'table' ? (
              <DataTableViewer data={message.data} columns={columns} />
            ) : (
              <AnalyticsChartViewer
                chartType={selectedChartType}
                data={message.data}
                config={message.chart_config}
                columns={columns}
              />
            )}
          </div>
        </div>
      )}

      {/* Expandable SQL Telemetry Drawer */}
      {message.sql_query && (
        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={() => setIsSqlOpen(!isSqlOpen)}
            className="flex items-center justify-between w-full text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-violet-600" />
              <span>Executed PostgreSQL Query & Safety Inspector</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-normal text-slate-400">Click to {isSqlOpen ? 'hide' : 'inspect'}</span>
              <ChevronDown size={14} className={`transform transition-transform ${isSqlOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <AnimatePresence>
            {isSqlOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner"
              >
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 font-mono">
                    <Database size={13} className="text-violet-400" />
                    <span>PostgreSQL Read-Only Mode</span>
                  </div>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed selection:bg-violet-900 selection:text-white">
                  {message.sql_query}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

const SuperAdminAgent = () => {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('codestral-latest');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [sugData, modelData] = await Promise.allSettled([
          superAdminAgentService.getSuggestions(),
          superAdminAgentService.getModels(),
        ]);
        if (sugData.status === 'fulfilled') setSuggestions(sugData.value || []);
        if (modelData.status === 'fulfilled') setAvailableModels(modelData.value || []);
      } catch (err) {
        console.error('Failed to load initial agent resources:', err);
      }
    };
    fetchInitData();
  }, []);

  const handleSend = async (promptToSend) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content || m.explanation || ''
      }));

      const res = await superAdminAgentService.chat({
        prompt: text.trim(),
        chat_history: historyPayload,
        model_name: selectedModel
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        timestamp: new Date(),
        ...res
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Agent query failed. Please try again.');
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        timestamp: new Date(),
        success: false,
        explanation: 'Failed to complete query. Please review the prompt or select an alternate reasoning model.',
        insights: [
          'Verify that database connection is healthy.',
          'Try refining prompt specifics or using one of the suggestion chips.'
        ]
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearSession = () => {
    setMessages([]);
    toast.success('Session cleared');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full min-h-[calc(100vh-80px)] flex flex-col space-y-6">
      {/* Futuristic Command Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#090d16] via-[#12132d] to-[#1e1a4d] text-white p-6 md:p-8 shadow-2xl border border-violet-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        {/* Cyber grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f110_1px,transparent_1px),linear-gradient(to_bottom,#6366f110_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MISTRAL AI ANALYTICS & SQL INTELLIGENCE AGENT</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-100 to-indigo-200">
            Super Admin Intelligence Console
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Query multi-tenant platform metrics, generate PostgreSQL schema analytics, visualize custom multi-chart intelligence, and export audit reports using Mistral Codestral.
          </p>
        </div>

        {/* Model Selector & Actions */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reasoning Engine</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900/90 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-lg cursor-pointer"
            >
              {availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))
              ) : (
                <>
                  <option value="codestral-latest">Codestral (Optimal for SQL)</option>
                  <option value="mistral-large-latest">Mistral Large (Deep Reasoning)</option>
                  <option value="mistral-medium-latest">Mistral Medium</option>
                </>
              )}
            </select>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearSession}
              className="mt-4 px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl border border-white/15 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Suggestion Prompts Row */}
      {messages.length === 0 && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles size={14} className="text-violet-600" /> Recommended Analytics Inquiries
            </h3>
            <span className="text-xs text-slate-400">Click any card to execute directly</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {suggestions.map((item) => (
              <TiltCard3D key={item.id} maxTilt={6} className="h-full">
                <button
                  onClick={() => handleSend(item.prompt)}
                  className="w-full h-full text-left p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h4 className="text-xs md:text-sm font-bold text-slate-800 group-hover:text-violet-700 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </div>
                </button>
              </TiltCard3D>
            ))}
          </div>
        </motion.div>
      )}

      {/* Messages Thread */}
      <div className="space-y-6 flex-1">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md text-sm font-medium leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <AssistantMessageCard message={msg} />
            )}
          </div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-violet-100 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center animate-spin">
              <Cpu size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">Mistral Codestral is synthesizing SQL & platform telemetry...</p>
              <p className="text-xs text-slate-400">Validating safety guardrails, executing query, and configuring charts.</p>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Floating Query Prompt Input Bar */}
      <div className="sticky bottom-6 z-20">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-3 shadow-2xl border border-violet-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-violet-600 shrink-0 ml-1">
            <Terminal size={18} />
          </div>

          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask any platform question (e.g. 'Show monthly JD creation by industry for 2026', 'List inactive tenants with total users')..."
            rows={1}
            disabled={isLoading}
            className="flex-1 text-sm bg-transparent border-0 focus:ring-0 focus:outline-none resize-none placeholder:text-slate-400 text-slate-800 max-h-28 py-2"
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputPrompt.trim() || isLoading}
            className="px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-violet-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <span>Run Query</span>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAgent;
