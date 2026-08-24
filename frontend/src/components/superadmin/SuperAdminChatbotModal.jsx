import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Bot, Send, Sparkles, Database, BarChart2, PieChart, Activity, Download,
  Copy, Check, RefreshCw, ChevronDown, ChevronRight, Layers, Table,
  TrendingUp, TrendingDown, ArrowRight, ShieldCheck, Zap, AlertCircle,
  FileText, CornerDownLeft, Terminal, Cpu, Building2, Users, ShieldAlert,
  Printer, Code, ExternalLink, HelpCircle, X, Maximize2, Minimize2, MessageSquare,
  GripHorizontal, Move
} from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, XAxis, YAxis,
  CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { superAdminAgentService } from '../../services/superAdminAgentService';
import toast from 'react-hot-toast';

// Curated vibrant high-contrast palette
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
  if (message.excel_base64) {
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
  exportToCSV(message.data, filename.replace('.xlsx', '.csv'));
};

const exportToCSV = (data, filename = 'talentforge_analytics.csv') => {
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
  toast.success('CSV downloaded');
};

const exportToJSON = (data, filename = 'talentforge_analytics.json') => {
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
  toast.success('JSON downloaded');
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
        <title>TalentForge Super Admin AI Analytics</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
          h1 { color: #4338ca; font-size: 22px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .summary { background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px; margin: 14px 0; border-radius: 4px; font-size: 13px; }
          .meta { font-size: 11px; color: #64748b; margin-top: 4px; }
          .sql { background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 11px; white-space: pre-wrap; margin: 14px 0; }
        </style>
      </head>
      <body>
        <h1>TalentForge AI Analytics Report</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()} | Model: ${message.model_used || 'Mistral Codestral'}</div>
        <div class="summary">
          <strong>Summary:</strong><br/>
          ${message.explanation || ''}
        </div>
        ${message.insights && message.insights.length ? `
          <h3>Factual Data Insights:</h3>
          <ul>
            ${message.insights.map(i => `<li>${i}</li>`).join('')}
          </ul>
        ` : ''}
        ${message.sql_query ? `
          <h3>Executed SQL Query:</h3>
          <div class="sql">${message.sql_query}</div>
        ` : ''}
        <h3>Data Table (${rows.length} rows):</h3>
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
    borderRadius: 12,
    color: '#f8fafc',
    fontSize: 11,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
  },
  itemStyle: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: 600
  },
  labelStyle: {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 11,
    marginBottom: 4
  }
};

// Dynamic Multi-Chart View Renderer
function AnalyticsChartViewer({ chartType, data, config, columns }) {
  if (!data || !data.length) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
        No records returned for graphical visualization.
      </div>
    );
  }

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
    <div className="w-full h-64 md:h-72 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'bar' && (
          <BarChart data={sanitizedData} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(99, 102, 241, 0.08)" }} />
            {!isSingleSeries && <Legend wrapperStyle={{ paddingTop: 6, fontSize: 11 }} />}
            {isSingleSeries ? (
              <Bar dataKey={activeYKeys[0]} name={formatLabel(activeYKeys[0])} radius={[6, 6, 0, 0]}>
                {sanitizedData.map((entry, index) => (
                  <Cell key={`bar-cell-${index}`} fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]} />
                ))}
              </Bar>
            ) : (
              activeYKeys.map((key, idx) => (
                <Bar key={key} dataKey={key} name={formatLabel(key)} fill={VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]} radius={[6, 6, 0, 0]} />
              ))
            )}
          </BarChart>
        )}

        {chartType === 'line' && (
          <LineChart data={sanitizedData} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 10 }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ paddingTop: 6, fontSize: 11 }} />
            {activeYKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={formatLabel(key)}
                stroke={VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length], stroke: '#ffffff', strokeWidth: 1.5 }}
              />
            ))}
          </LineChart>
        )}

        {chartType === 'area' && (
          <AreaChart data={sanitizedData} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
            <defs>
              {activeYKeys.map((key, idx) => {
                const color = VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length];
                return (
                  <linearGradient key={key} id={`modalAreaGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.45}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0.02}/>
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 10 }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ paddingTop: 6, fontSize: 11 }} />
            {activeYKeys.map((key, idx) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={formatLabel(key)}
                stroke={VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]}
                fillOpacity={1}
                fill={`url(#modalAreaGrad_${idx})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )}

        {chartType === 'pie' && (
          <RechartsPie>
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Pie
              data={sanitizedData}
              dataKey={activeYKeys[0] || 'count'}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={85}
              innerRadius={40}
              paddingAngle={3}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {sanitizedData.map((entry, index) => (
                <Cell key={`modal-pie-cell-${index}`} fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]} />
              ))}
            </Pie>
          </RechartsPie>
        )}

        {chartType === 'radar' && (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={sanitizedData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 10 }} />
            <PolarRadiusAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {activeYKeys.map((key, idx) => (
              <Radar
                key={key}
                name={formatLabel(key)}
                dataKey={key}
                stroke={VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]}
                fill={VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]}
                fillOpacity={0.35}
              />
            ))}
          </RadarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Compact Table Viewer
function DataTableViewer({ data, columns }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 6;

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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="Filter records..."
          className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 w-44"
        />
        <span className="text-[11px] text-slate-400">
          {filteredData.length} records
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm max-h-56">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[9px] sticky top-0">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-3 py-2 whitespace-nowrap">{col.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {paginated.map((row, idx) => (
              <tr key={idx} className="hover:bg-violet-50/30">
                {columns.map(col => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap text-slate-700">
                    {row[col] === null || row[col] === undefined ? (
                      <span className="text-slate-300 italic">null</span>
                    ) : typeof row[col] === 'boolean' ? (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row[col] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {row[col] ? 'true' : 'false'}
                      </span>
                    ) : (
                      '' + row[col]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1.5 pt-1 text-xs">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-[11px] text-slate-500">
            {currentPage}/{totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// Single AI Assistant Response in Modal
function ModalAssistantMessage({ message }) {
  const [selectedChartType, setSelectedChartType] = useState(message.suggested_chart_type === 'table' || message.is_table_requested ? 'table' : (message.suggested_chart_type || 'bar'));
  const [isSqlOpen, setIsSqlOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    if (!message.sql_query) return;
    navigator.clipboard.writeText(message.sql_query);
    setCopied(true);
    toast.success('SQL copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const hasData = message.data && message.data.length > 0;
  const columns = message.columns || (hasData ? Object.keys(message.data[0]) : []);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 space-y-4">
      {/* Header & Actions */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm">
            <Bot size={15} />
          </div>
          <div>
            <span className="font-bold text-xs text-slate-800">TalentForge AI Agent</span>
            <span className="text-[10px] text-slate-400 ml-2">
              {message.execution_time_ms ? `${message.execution_time_ms}ms` : ''} · {message.data?.length || 0} rows
            </span>
          </div>
        </div>

        {hasData && (
          <div className="flex items-center gap-1">
            <button
                onClick={() => exportToExcel(message)}
                className="px-2 py-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold border border-emerald-200"
                title="Download Excel (.xlsx)"
              >
                <Download size={11} />
                <span>Excel</span>
              </button>
              <button
                onClick={() => exportToCSV(message.data)}
                className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                title="Download CSV"
              >
                <Download size={13} />
              </button>
            <button
              onClick={() => printReport(message)}
              className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
              title="Print Report"
            >
              <Printer size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Explanation */}
      {message.explanation && (
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          {message.explanation}
        </p>
      )}

      {/* Factual KPI Cards */}
      {message.kpi_cards && message.kpi_cards.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {message.kpi_cards.map((kpi, idx) => (
            <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{kpi.label}</span>
              <span className="text-base font-black text-slate-800 tracking-tight mt-1">{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Factual Insights */}
      {message.insights && message.insights.length > 0 && (
        <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-500" /> Factual Insights
          </span>
          <div className="space-y-1">
            {message.insights.map((insight, idx) => (
              <p key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                <span>{insight}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Multi-Chart Studio */}
      {hasData && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            {[
              { id: 'bar', label: 'Bar', icon: BarChart2 },
              { id: 'area', label: 'Area', icon: Activity },
              { id: 'line', label: 'Line', icon: TrendingUp },
              { id: 'pie', label: 'Pie', icon: PieChart },
              { id: 'radar', label: 'Radar', icon: Layers },
              { id: 'table', label: 'Table', icon: Table },
            ].map(tab => {
              const Icon = tab.icon;
              const active = selectedChartType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedChartType(tab.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                    active ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-200/70">
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

      {/* Collapsible SQL */}
      {message.sql_query && (
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setIsSqlOpen(!isSqlOpen)}
            className="flex items-center justify-between w-full text-[11px] font-bold text-slate-500 hover:text-slate-800"
          >
            <div className="flex items-center gap-1.5">
              <Terminal size={12} className="text-violet-600" />
              <span>Inspect Generated SQL</span>
            </div>
            <ChevronDown size={12} className={`transform transition-transform ${isSqlOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isSqlOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 rounded-xl bg-slate-950 p-3 text-[10px] font-mono text-emerald-400 overflow-x-auto relative"
              >
                <button
                  onClick={handleCopySql}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white bg-slate-800 rounded"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
                <pre>{message.sql_query}</pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminChatbotModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const chatEndRef = useRef(null);

  // Drag controls from framer-motion
  const dragControls = useDragControls();

  // Custom resizing state
  const [size, setSize] = useState({ width: 580, height: 680 });
  const isResizingRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      superAdminAgentService.getSuggestions().then(data => setSuggestions(data || [])).catch(() => {});
    }
  }, [isOpen, suggestions.length]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Resizing mouse event handlers
  const handleResizeStart = (direction, e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = direction;
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height
    };

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const dx = moveEvent.clientX - startPosRef.current.x;
      const dy = moveEvent.clientY - startPosRef.current.y;
      const dir = isResizingRef.current;

      let newWidth = startPosRef.current.w;
      let newHeight = startPosRef.current.h;

      if (dir.includes('e')) newWidth = startPosRef.current.w + dx;
      if (dir.includes('w')) newWidth = startPosRef.current.w - dx;
      if (dir.includes('s')) newHeight = startPosRef.current.h + dy;
      if (dir.includes('n')) newHeight = startPosRef.current.h - dy;

      const maxWidth = window.innerWidth - 30;
      const maxHeight = window.innerHeight - 30;

      setSize({
        width: Math.min(maxWidth, Math.max(420, newWidth)),
        height: Math.min(maxHeight, Math.max(460, newHeight))
      });
    };

    const handleMouseUp = () => {
      isResizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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
        chat_history: historyPayload
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
      toast.error(err?.message || 'Agent query failed');
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          timestamp: new Date(),
          explanation: 'Failed to process inquiry. Please try rephrasing your question.'
        }
      ]);
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

  return (
    <>
      {/* Floating Action Button (Always fixed at bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 text-white flex items-center justify-center shadow-2xl shadow-violet-600/40 border-2 border-white/30 group cursor-pointer"
          title="TalentForge Super Admin AI Analytics Chatbot"
        >
          {/* Pulsing halo aura */}
          <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-30 pointer-events-none" />
          
          {isOpen ? (
            <X size={24} className="transition-transform group-hover:rotate-90" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot size={26} />
              <Sparkles size={12} className="absolute -top-1.5 -right-1 text-amber-300 animate-pulse" />
            </div>
          )}
        </motion.button>
      </div>

      {/* Floating Draggable & Resizable Chatbot Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag={!isExpanded}
            dragListener={false}
            dragControls={dragControls}
            dragMomentum={false}
            dragElastic={0}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={
              isExpanded
                ? undefined
                : {
                    width: `${size.width}px`,
                    height: `${size.height}px`,
                    maxWidth: '96vw',
                    maxHeight: '92vh',
                  }
            }
            className={`fixed z-50 bg-white/95 backdrop-blur-2xl shadow-2xl rounded-3xl border border-violet-200/80 flex flex-col overflow-hidden select-text ${
              isExpanded
                ? 'inset-4 md:inset-8 w-auto h-auto'
                : 'bottom-24 right-6'
            }`}
          >
            {/* Draggable Header */}
            <div
              onPointerDown={(e) => !isExpanded && dragControls.start(e)}
              className={`bg-gradient-to-r from-[#090d16] via-[#12132d] to-[#1e1a4d] text-white p-3.5 px-4 flex items-center justify-between shrink-0 border-b border-violet-500/20 ${
                isExpanded ? '' : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Bot size={17} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs md:text-sm text-white">TalentForge AI Analytics</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-violet-200">Mistral Codestral Dynamic SQL & Multi-Chart Engine</p>
                </div>
              </div>

              {/* Drag indicator & Window controls */}
              <div className="flex items-center gap-1">
                {!isExpanded && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg text-slate-300 text-[10px] mr-1 pointer-events-none select-none">
                    <GripHorizontal size={13} />
                    <span>Drag to move</span>
                  </div>
                )}
                {messages.length > 0 && (
                  <button
                    onClick={() => { setMessages([]); toast.success('Cleared chat'); }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    title="Clear Conversation"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title={isExpanded ? 'Restore Size' : 'Maximize'}
                >
                  {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="space-y-4 py-4">
                  <div className="text-center space-y-1.5 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto shadow-sm">
                      <Sparkles size={22} />
                    </div>
                    <h4 className="font-bold text-sm text-slate-800">Dynamic AI Analytics Assistant</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Ask any question about tenants, JDs, user census, or exports. Live SQL is generated and charts are rendered dynamically.
                    </p>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                        Recommended Questions
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {suggestions.slice(0, 4).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSend(s.prompt)}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200/80 hover:border-violet-400 hover:shadow-sm transition-all group cursor-pointer"
                          >
                            <span className="text-[9px] font-extrabold uppercase text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                              {s.category}
                            </span>
                            <p className="text-xs font-semibold text-slate-700 group-hover:text-violet-700 mt-1 line-clamp-2">
                              {s.prompt}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm text-xs font-medium leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <ModalAssistantMessage message={msg} />
                    )}
                  </div>
                ))
              )}

              {isLoading && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center animate-spin">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Generating SQL & Dynamic Visuals...</p>
                    <p className="text-[10px] text-slate-400">Executing read-only PostgreSQL query</p>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-1.5 border border-slate-200 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
                <textarea
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask any platform analytics question..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 text-xs bg-transparent border-0 focus:ring-0 focus:outline-none resize-none placeholder:text-slate-400 text-slate-800 max-h-24 px-2 py-1.5"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputPrompt.trim() || isLoading}
                  className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm cursor-pointer"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>

            {/* Multi-Directional Resize Handles */}
            {!isExpanded && (
              <>
                {/* Bottom-Right Corner Handle */}
                <div
                  onMouseDown={(e) => handleResizeStart('se', e)}
                  className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-center justify-center text-slate-400 hover:text-violet-600 group z-30"
                  title="Resize window"
                >
                  <svg className="w-3 h-3 text-slate-300 group-hover:text-violet-500 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="19" cy="19" r="2" />
                    <circle cx="13" cy="19" r="2" />
                    <circle cx="19" cy="13" r="2" />
                    <circle cx="7" cy="19" r="2" />
                    <circle cx="13" cy="13" r="2" />
                    <circle cx="19" cy="7" r="2" />
                  </svg>
                </div>

                {/* Bottom-Left Corner Handle */}
                <div
                  onMouseDown={(e) => handleResizeStart('sw', e)}
                  className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-30"
                />

                {/* Top-Left Corner Handle */}
                <div
                  onMouseDown={(e) => handleResizeStart('nw', e)}
                  className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-30"
                />

                {/* Top-Right Corner Handle */}
                <div
                  onMouseDown={(e) => handleResizeStart('ne', e)}
                  className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-30"
                />

                {/* Right Edge Handle */}
                <div
                  onMouseDown={(e) => handleResizeStart('e', e)}
                  className="absolute top-8 bottom-4 right-0 w-2 cursor-e-resize hover:bg-violet-400/20 transition-colors z-20"
                />

                {/* Left Edge Handle */}
                <div
                  onMouseDown={(e) => handleResizeStart('w', e)}
                  className="absolute top-8 bottom-4 left-0 w-2 cursor-w-resize hover:bg-violet-400/20 transition-colors z-20"
                />

                {/* Bottom Edge Handle */}
                <div
                  onMouseDown={(e) => handleResizeStart('s', e)}
                  className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize hover:bg-violet-400/20 transition-colors z-20"
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
