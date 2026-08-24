import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio, Plus, Trash2, Edit, X, Check, Sparkles, AlertTriangle,
  Info, Bell, ShieldAlert, Zap, Calendar, Clock, ChevronRight,
  Layers, Copy, ArrowRight, Eye, EyeOff, Monitor, Layout, AlertCircle,
  CheckCircle2, Wrench, PartyPopper
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { superAdminService } from '../../services/superAdminService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getBroadcastStatus, toBroadcastExpiryIso } from '../../services/broadcastService';
import { BROADCAST_TYPE_STYLES } from '../../constants/broadcastStyles';

const PREDEFINED_TEMPLATES = [
  {
    id: 'data_leakage_lockdown',
    name: '🚨 Data Leakage Containment Lockdown',
    icon: ShieldAlert,
    type: 'lockdown',
    title: 'CRITICAL SECURITY CONTAINMENT: DATA LEAKAGE INCIDENT RESPONSE',
    message: 'A potential data integrity / unauthorized access incident is currently under investigation. As a precautionary measure, platform access across all organizations and user sessions has been temporarily locked down. Super Admin engineering teams are actively containing the environment.',
    expiryDays: 1,
    badge: 'EMERGENCY LOCKDOWN',
  },
  {
    id: 'critical_incident_shutdown',
    name: '🔒 Emergency System Incident Shutdown',
    icon: AlertCircle,
    type: 'lockdown',
    title: 'EMERGENCY PLATFORM SHUTDOWN & CONTAINMENT',
    message: 'The website is temporarily closed for emergency incident containment and security remediation. All data pipelines and user interactions are locked. Access will resume once security clearance is signed off by Super Admin.',
    expiryDays: 1,
    badge: 'HARD LOCKDOWN',
  },

  {
    id: 'scheduled_maintenance',
    name: 'Scheduled Server Downtime',
    icon: Wrench,
    type: 'maintenance',
    title: 'Scheduled System Maintenance Window',
    message: 'We will be conducting scheduled system maintenance on [Date] from [Start Time] to [End Time] (UTC). The platform will be temporarily unavailable during this period. We apologize for any inconvenience.',
    expiryDays: 3,
    badge: 'Maintenance',
  },
  {
    id: 'service_disruption',
    name: 'Emergency Outage / Disruption',
    icon: AlertCircle,
    type: 'alert',
    title: 'Service Degradation Notice: Under Investigation',
    message: 'We are currently observing intermittent disruptions affecting platform synchronization and integrations. Our engineering team is actively investigating and deploying a fix. Next update in 30 minutes.',
    expiryDays: 1,
    badge: 'Urgent Alert',
  },
  {
    id: 'new_feature',
    name: 'New Platform Feature Launch',
    icon: Sparkles,
    type: 'feature',
    title: '🚀 New Release: AI Intelligence Console v3.0 is Live!',
    message: 'We are thrilled to introduce the new AI Intelligence & SQL Analytics Console for Super Admins, featuring live multi-chart generation, instant CSV/JSON exports, and customizable reporting.',
    expiryDays: 14,
    badge: 'Feature',
  },
  {
    id: 'security_notice',
    name: 'Mandatory Security & MFA Notice',
    icon: ShieldAlert,
    type: 'security',
    title: 'Security Protocol: Mandatory Credential & MFA Verification',
    message: 'As part of our regular compliance audit, all administrators and privileged users are required to review active sessions and ensure Multi-Factor Authentication (MFA) is enabled by [Date].',
    expiryDays: 7,
    badge: 'Security',
  },
  {
    id: 'compliance_update',
    name: 'Terms & Compliance Update',
    icon: Layers,
    type: 'compliance',
    title: 'Platform Terms of Service & Privacy Policy Update',
    message: 'Our Master Services Agreement and Data Privacy Policy have been updated to reflect new regulatory guidelines. Please review the updated policy in your organization compliance center.',
    expiryDays: 30,
    badge: 'Compliance',
  },
  {
    id: 'celebration_notice',
    name: 'Holiday / Achievement Greeting',
    icon: PartyPopper,
    type: 'celebration',
    title: '🎉 Holiday Greetings & Platform Milestones',
    message: 'Wishing all our partner organizations and users a joyful holiday season! Support response times may be slightly extended from [Start Date] to [End Date], while critical uptime monitoring remains 24/7.',
    expiryDays: 7,
    badge: 'Holiday',
  },
  {
    id: 'resolution_success',
    name: 'Incident Resolved / Service Restored',
    icon: CheckCircle2,
    type: 'success',
    title: 'Incident Resolved: All Services Fully Operational',
    message: 'The integration gateway latency issue identified earlier today has been completely resolved. All synchronization queues have finished processing normally. Thank you for your patience.',
    expiryDays: 2,
    badge: 'Resolved',
  },
  {
    id: 'general_info',
    name: 'General Platform Advisory',
    icon: Info,
    type: 'info',
    title: 'General Platform Update & Best Practices Advisory',
    message: 'Please ensure all department job descriptions are updated to the latest standard format before the upcoming quarterly talent review cycle.',
    expiryDays: 10,
    badge: 'Advisory',
  }
];

const SEVERITY_THEMES = [
  { value: 'lockdown', label: '🚨 EMERGENCY LOCKDOWN / DATA LEAKAGE SHUTDOWN (Hard Lockout)', bg: 'bg-rose-950 text-rose-200 border border-rose-500 font-extrabold' },

  { value: 'info', label: 'Information (Indigo / Sapphire)', bg: 'bg-indigo-100 text-indigo-700' },
  { value: 'warning', label: 'Warning (Amber / Caution)', bg: 'bg-amber-100 text-amber-700' },
  { value: 'alert', label: 'Urgent Alert (Rose / Emergency)', bg: 'bg-rose-100 text-rose-700' },
  { value: 'error', label: 'System Error (Red / Critical)', bg: 'bg-red-100 text-red-700' },
  { value: 'success', label: 'Success & Resolution (Emerald)', bg: 'bg-emerald-100 text-emerald-700' },
  { value: 'security', label: 'Security & Compliance (Purple)', bg: 'bg-purple-100 text-purple-700' },
  { value: 'feature', label: 'New Feature / Release (Cyan)', bg: 'bg-cyan-100 text-cyan-700' },
  { value: 'maintenance', label: 'Maintenance Window (Orange)', bg: 'bg-orange-100 text-orange-700' },
  { value: 'celebration', label: 'Celebration / Holiday (Pink)', bg: 'bg-pink-100 text-pink-700' },
  { value: 'compliance', label: 'Policy & Legal Update (Blue)', bg: 'bg-blue-100 text-blue-700' },
];

const formatToLocalInput = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const SuperAdminBroadcasts = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    is_active: true,
    expires_at: ''
  });

  const fetchBroadcasts = async () => {
    setIsLoading(true);
    try {
      const data = await superAdminService.getAllBroadcasts();
      setBroadcasts(data);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to load broadcasts");
      setBroadcasts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleOpenModal = (broadcast = null) => {
    setSelectedTemplateId(null);
    setActiveTab('edit');
    if (broadcast) {
      setEditingBroadcast(broadcast);
      setFormData({
        title: broadcast.title,
        message: broadcast.message,
        type: broadcast.type || 'info',
        is_active: broadcast.is_active,
        expires_at: formatToLocalInput(broadcast.expires_at)
      });
    } else {
      setEditingBroadcast(null);
      const defaultExpiry = formatToLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setFormData({
        title: '',
        message: '',
        type: 'info',
        is_active: true,
        expires_at: defaultExpiry
      });
    }
    setIsModalOpen(true);
  };

  const applyTemplate = (template) => {
    setSelectedTemplateId(template.id);
    const expiryDate = formatToLocalInput(new Date(Date.now() + template.expiryDays * 24 * 60 * 60 * 1000));
    setFormData({
      title: template.title,
      message: template.message,
      type: template.type,
      is_active: true,
      expires_at: expiryDate
    });
    toast.success(`Applied template: ${template.name}`);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const payload = {
      ...formData,
      expires_at: toBroadcastExpiryIso(formData.expires_at),
    };

    try {
      if (editingBroadcast) {
        await superAdminService.updateBroadcast(editingBroadcast.id, payload);
        toast.success("Broadcast updated successfully");
      } else {
        await superAdminService.createBroadcast(payload);
        toast.success("Broadcast created successfully");
      }
      setIsModalOpen(false);
      fetchBroadcasts();
    } catch (error) {
      toast.error(editingBroadcast ? "Failed to update broadcast" : "Failed to create broadcast");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this broadcast?")) return;
    try {
      await superAdminService.deleteBroadcast(id);
      toast.success("Broadcast deleted");
      fetchBroadcasts();
    } catch (error) {
      toast.error("Failed to delete broadcast");
    }
  };

  const previewTypeStyles = useMemo(() => {
    const type = (formData.type || 'info').toLowerCase();
    return BROADCAST_TYPE_STYLES[type] || BROADCAST_TYPE_STYLES.info;
  }, [formData.type]);

  const PreviewIcon = previewTypeStyles.icon;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full relative space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Radio size={14} className="animate-pulse text-indigo-600" />
            <span>Global Tenant Notifications</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Broadcasts</h1>
          <p className="text-slate-500 text-sm mt-1">
            Dispatch themed announcements, maintenance warnings, security alerts, and holiday notices across all tenant portals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const tmpl = PREDEFINED_TEMPLATES.find(t => t.id === 'data_leakage_lockdown') || PREDEFINED_TEMPLATES[0];
              handleOpenModal();
              applyTemplate(tmpl);
            }}
            className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white px-4 py-2.5 rounded-xl font-extrabold text-sm flex items-center space-x-2 shadow-lg shadow-rose-600/30 hover:scale-105 transition-all cursor-pointer border border-rose-400/40 animate-pulse"
          >
            <ShieldAlert size={18} />
            <span>🚨 Emergency Lockdown</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>New Broadcast</span>
          </button>
        </div>
      </div>

      {/* Broadcast Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading broadcasts...</p>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="col-span-full p-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Radio size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No active broadcasts found</h3>
            <p className="text-xs text-slate-400 max-w-sm">Use predefined templates to publish your first announcement or downtime notice to all platform tenants.</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Create broadcast with templates &rarr;
            </button>
          </div>
        ) : (
          broadcasts.map((broadcast) => {
            const status = getBroadcastStatus(broadcast);
            const typeStyle = BROADCAST_TYPE_STYLES[(broadcast.type || 'info').toLowerCase()] || BROADCAST_TYPE_STYLES.info;
            const CardIcon = typeStyle.icon;

            return (
              <motion.div 
                key={broadcast.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-md hover:border-indigo-300 transition-all group"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="p-3 rounded-xl shadow-sm"
                      style={{ backgroundColor: `${typeStyle.accentColor}15`, color: typeStyle.accentColor }}
                    >
                      <CardIcon size={22} />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 border ${
                      status.label === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {status.label === 'Active' ? <Check size={12} /> : <X size={12} />}
                      <span>{status.label}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider"
                      style={{ backgroundColor: `${typeStyle.accentColor}20`, color: typeStyle.accentColor }}
                    >
                      {broadcast.type || 'info'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                    {broadcast.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 font-normal">
                    {broadcast.message}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-4 mt-6 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expires</span>
                    <span className="text-xs text-slate-700 font-medium mt-0.5">
                      {broadcast.expires_at ? format(new Date(broadcast.expires_at), 'MMM dd, yyyy HH:mm') : 'Never'}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleOpenModal(broadcast)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Broadcast"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(broadcast.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Broadcast"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Creation / Edit Modal with Themed Templates & Live Preview */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-100"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Radio size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {editingBroadcast ? 'Edit System Broadcast' : 'Create System Broadcast'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {editingBroadcast ? 'Update announcement parameters and preview exact user experience' : 'Select a theme template or write a custom broadcast with exact live preview.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Tabs */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setActiveTab('edit')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'edit'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Edit size={13} />
                      <span>Form</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'preview'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Eye size={13} />
                      <span>User Popup Preview</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Emergency Incident Lockdown Presets */}
              {!editingBroadcast && activeTab === 'edit' && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                      <ShieldAlert size={15} /> 🚨 EMERGENCY INCIDENT & LOCKDOWN PRESETS (Hard Website Shutdown)
                    </span>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full">Shuts Down Whole Website</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PREDEFINED_TEMPLATES.filter(t => t.type === 'lockdown').map((tmpl) => {
                      const isSelected = selectedTemplateId === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => applyTemplate(tmpl)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-center gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-rose-950 text-rose-200 border-rose-500 shadow-md ring-2 ring-rose-500/30'
                              : 'bg-rose-900/10 hover:bg-rose-900/25 border-rose-500/30 text-rose-900'
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-rose-600 text-white shadow-sm shrink-0">
                            <ShieldAlert size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-rose-700 block">{tmpl.name}</span>
                            <span className="text-[10px] text-slate-500 line-clamp-1">{tmpl.title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Predefined Templates Selector */}
              {!editingBroadcast && activeTab === 'edit' && (
                <div className="mb-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <Sparkles size={14} /> Themed Announcement Templates
                    </span>
                    <span className="text-[11px] text-slate-400">Click to autofill</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PREDEFINED_TEMPLATES.map((tmpl) => {
                      const Icon = tmpl.icon;
                      const isSelected = selectedTemplateId === tmpl.id;
                      const tmplStyle = BROADCAST_TYPE_STYLES[tmpl.type] || BROADCAST_TYPE_STYLES.info;

                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => applyTemplate(tmpl)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between group cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                              : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1.5">
                            <div
                              className="p-1 rounded-md"
                              style={{ backgroundColor: `${tmplStyle.accentColor}20`, color: tmplStyle.accentColor }}
                            >
                              <Icon size={13} />
                            </div>
                            <span
                              className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded"
                              style={{ backgroundColor: `${tmplStyle.accentColor}15`, color: tmplStyle.accentColor }}
                            >
                              {tmpl.badge}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {tmpl.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Tab */}
              {activeTab === 'edit' && (
                <form onSubmit={handleSubmit} className="space-y-4">
{formData.type === 'lockdown' && (
                        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-3 shadow-lg shadow-rose-950/50 animate-pulse">
                          <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold text-white text-xs uppercase tracking-wider">⚠️ CRITICAL PLATFORM HARD LOCKOUT ACTION</p>
                            <p className="mt-1 leading-relaxed text-rose-200/90 text-[11px]">
                              Publishing this broadcast will <strong>immediately shut down the entire website</strong> for all organizations, admins, HRs, managers, and public users. Only the Emergency Lockdown Screen will be shown until you deactivate or delete this broadcast.
                            </p>
                          </div>
                        </div>
                      )}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Broadcast Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Scheduled Maintenance Window"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none text-sm text-slate-800 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Announcement Message
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      placeholder="Provide details about the announcement, scheduled downtime, or update..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none text-sm text-slate-800 leading-relaxed font-normal"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Theme / Severity Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none text-xs text-slate-800 font-medium cursor-pointer"
                      >
                        {SEVERITY_THEMES.map(theme => (
                          <option key={theme.value} value={theme.value}>{theme.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Expiration Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.expires_at}
                        onChange={e => setFormData({...formData, expires_at: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none text-xs text-slate-800 font-medium cursor-pointer"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Active Status</span>
                      <span className="text-[10px] text-slate-400">Broadcast immediately visible across all tenant portals</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData({...formData, is_active: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Preview User Popup</span>
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{editingBroadcast ? 'Save Changes' : 'Publish Broadcast'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
              )}

              {/* Exact User Popup Modal Simulation Tab */}
              {activeTab === 'preview' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor size={16} className="text-indigo-400" />
                      <div>
                        <h3 className="font-bold text-xs">Exact End-User & Admin Popup Simulation</h3>
                        <p className="text-[10px] text-slate-400">
                          Theme applied: <span className="text-white font-bold">{previewTypeStyles.label}</span>. Every user will see this dialog upon logging in until they acknowledge it.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-400/30">
                      Live Simulation
                    </span>
                  </div>

                  {/* The Exact User Popup Card (1:1 with BroadcastAnnouncementModal.jsx) */}
                  <div className="relative p-6 rounded-2xl bg-slate-950/85 border border-slate-800 flex items-center justify-center">
                    <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/60 bg-[#0f1117] shadow-2xl">
                      {/* Modal Header */}
                      <div className={`flex items-center gap-3 border-b px-6 py-4.5 ${previewTypeStyles.header}`}>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/30 shrink-0 shadow-inner">
                          <PreviewIcon size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-85">Platform Announcement</p>
                          <h2 className="truncate text-base md:text-lg font-extrabold text-white">
                            {formData.title || 'Broadcast Title Placeholder'}
                          </h2>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide border ${previewTypeStyles.badge}`}>
                          {(formData.type || 'info').toUpperCase()}
                        </span>
                      </div>

                      {/* Modal Message Body */}
                      <div className="px-6 py-6 space-y-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200 font-normal">
                          {formData.message || 'Your announcement message text will be displayed here for all users to read.'}
                        </p>
                        <p className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                          <Radio size={13} className="text-slate-500 animate-pulse" />
                          <span>Valid until {formData.expires_at ? format(new Date(formData.expires_at), 'MMM dd, yyyy · h:mm a') : 'Never'}</span>
                        </p>
                      </div>

                      {/* Modal Footer with "I understand" button */}
                      <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-4 bg-black/25">
                        <span className="text-xs text-slate-400 italic">User clicks button to confirm receipt</span>
                        <button
                          type="button"
                          className={`rounded-xl px-6 py-2.5 text-xs md:text-sm font-extrabold transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer ${previewTypeStyles.button}`}
                        >
                          I understand
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions in Preview Tab */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('edit')}
                      className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit size={13} />
                      <span>Back to Edit Form</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Confirm & Publish Broadcast</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminBroadcasts;
