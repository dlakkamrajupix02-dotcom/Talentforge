import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Search, Edit2, ShieldAlert, Check, X, LayoutGrid, List,
  Calendar, Shield, Zap, Clock, Plus, Upload, Loader2, Sparkles, Globe, Server, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { superAdminService } from '../../services/superAdminService';
import { uploadOrgImage } from '../../services/organizationService';
import { BASE_URL } from '../../services/apiClient';
import TiltCard3D from '../../components/common/TiltCard3D';
import OrganizationsHero3D from '../../components/superadmin/OrganizationsHero3D';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const resolveOrgImageUrl = (url) => {
  if (!url || url === 'null' || url === 'undefined' || typeof url !== 'string') return null;
  if (url.startsWith('data:')) return url;
  
  // Normalize direct backend URLs to use the dev proxy
  if (url.startsWith('http://127.0.0.1:8000') || url.startsWith('http://localhost:8000')) {
    const relativePath = url.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000/, '');
    return `/backend${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  if (cleanPath.startsWith('/backend/')) return cleanPath;
  return `${BASE_URL}${cleanPath}`;
};

const ORG_IMAGE_RULES = {
  minWidth: 16,
  minHeight: 16,
  maxAspect: 10,
  minAspect: 0.1,
};

const validateOrgImageFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { naturalWidth: width, naturalHeight: height } = img;
      const aspect = width / height;

      if (width < ORG_IMAGE_RULES.minWidth || height < ORG_IMAGE_RULES.minHeight) {
        reject(`Image must be at least ${ORG_IMAGE_RULES.minWidth}×${ORG_IMAGE_RULES.minHeight}px.`);
        return;
      }
      resolve({ width, height, aspect });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject('Could not read the image file.');
    };
    img.src = objectUrl;
  });

function OrgLogo({ src, alt, className = '' }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    const initials = (alt || 'ORG')
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-indigo-500/10 via-purple-500/15 to-violet-500/20 border border-violet-200/40 backdrop-blur-md ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-violet-300/40">
            {initials}
          </div>
          <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{alt}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center bg-white/95 p-2 ${className}`}>
      <img
        key={src}
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function OrgCardHeader({ imageUrl, orgName, industry, isActive, onEdit, onAccess }) {
  return (
    <div className="relative h-[210px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f19] via-[#1e1b4b] to-[#312e81]" />
      <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_60%)]" />
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between p-4">
        <span 
          style={{ transform: 'translateZ(20px)' }}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider backdrop-blur-md border shadow-sm ${
          isActive
            ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40 shadow-emerald-950/40'
            : 'bg-rose-500/25 text-rose-200 border-rose-400/40 shadow-rose-950/40'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
        <div className="flex gap-1.5" style={{ transform: 'translateZ(30px)' }}>
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/25 flex items-center justify-center text-white backdrop-blur border border-white/15 hover:border-white/30 hover:scale-105 shadow-sm transition-all"
            title="Edit Organization"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={onAccess}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/25 flex items-center justify-center text-white backdrop-blur border border-white/15 hover:border-white/30 hover:scale-105 shadow-sm transition-all"
            title="Access Permissions"
          >
            <ShieldAlert size={13} />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-1 pb-16">
        <OrgLogo
          src={imageUrl}
          alt={orgName}
          className="h-[72px] w-[min(220px,85%)] rounded-2xl shadow-xl border border-white/20"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-10 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent">
        <h3 className="text-lg font-bold text-white text-center truncate drop-shadow-md">{orgName}</h3>
        <p className="text-xs text-indigo-200/80 text-center truncate mt-0.5">{industry || 'Industry not set'}</p>
      </div>
    </div>
  );
}

const EMPTY_CREATE_FORM = {
  org_name: '',
  org_industry: '',
  admin_full_name: '',
  admin_email: '',
  admin_password: '',
  admin_country: '',
  admin_color_code: '#6366f1',
};

function CreateOrganizationModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_CREATE_FORM);
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [isOpen]);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be 2MB or smaller');
      e.target.value = '';
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Logo must be PNG, JPEG, WebP, or SVG');
      e.target.value = '';
      return;
    }
    try {
      await validateOrgImageFile(file);
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not read image file');
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('org_name', form.org_name.trim());
      if (form.org_industry.trim()) fd.append('org_industry', form.org_industry.trim());
      fd.append('admin_full_name', form.admin_full_name.trim());
      fd.append('admin_email', form.admin_email.trim());
      fd.append('admin_password', form.admin_password);
      fd.append('admin_country', form.admin_country.trim());
      if (form.admin_color_code.trim()) fd.append('admin_color_code', form.admin_color_code.trim());
      if (logoFile) fd.append('org_image', logoFile);

      const result = await superAdminService.createOrgWithAdmin(fd);
      if (result?.email_sent === false) {
        toast.success('Organization created, but the welcome email could not be sent. Share admin credentials manually.');
      } else {
        toast.success('Organization created. Welcome email sent to the admin.');
      }
      onCreated();
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Create New Organisation</h2>
                  <p className="text-xs text-violet-100 mt-0.5">Fill in the details to setup a new tenant.</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
            <section>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                <Building2 size={14} className="text-violet-500" />
                Organisation Details
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Organisation Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.org_name}
                    onChange={(e) => setForm({ ...form, org_name: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Industry</label>
                    <input
                      type="text"
                      value={form.org_industry}
                      onChange={(e) => setForm({ ...form, org_industry: e.target.value })}
                      placeholder="e.g. Technology"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Organization Logo <span className="text-slate-400 font-normal">(Max 2MB)</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors">
                      <Upload size={16} className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 truncate">{logoFile ? logoFile.name : 'Choose File'}</span>
                      <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleLogoChange} />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Min 400×200px. Square logo (512×512) or banner (1200×400) recommended.
                    </p>
                  </div>
                </div>
                {logoPreview && (
                  <div className="h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-3">
                    <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                <Shield size={14} className="text-violet-500" />
                Administrator Details
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Admin Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.admin_full_name}
                    onChange={(e) => setForm({ ...form, admin_full_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Admin Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    placeholder="john@acmecorp.com"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.admin_password}
                    onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.admin_country}
                    onChange={(e) => setForm({ ...form, admin_country: e.target.value })}
                    placeholder="e.g. United States"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Color Code</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.admin_color_code}
                      onChange={(e) => setForm({ ...form, admin_color_code: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={form.admin_color_code}
                      onChange={(e) => setForm({ ...form, admin_color_code: e.target.value })}
                      placeholder="#HEXCODE OR LEAVE EMPTY"
                      className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 uppercase"
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/25 flex items-center gap-2 disabled:opacity-70"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Organisation
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function OrgCard({ org, onEdit, onAccess }) {
  const imageUrl = resolveOrgImageUrl(org.image_url);
  const createdDate = format(new Date(org.created_at || new Date()), 'dd MMM, yyyy');
  const expireDate = org.access_valid_until ? new Date(org.access_valid_until) : null;
  const expireFormatted = expireDate ? format(expireDate, 'dd MMM, yyyy') : 'Never';

  let daysLeft = 0;
  let progressPercent = 0;
  if (expireDate) {
    const diffTime = expireDate - new Date();
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    progressPercent = Math.max(0, Math.min(100, (daysLeft / 30) * 100));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full"
    >
      <TiltCard3D
        maxTilt={8}
        scale={1.02}
        perspective={1200}
        className="relative rounded-[24px] overflow-hidden bg-slate-100 shadow-sm border border-slate-200 hover:shadow-2xl transition-all group flex flex-col h-full"
      >
        <div style={{ transform: 'translateZ(15px)' }}>
          <OrgCardHeader
            imageUrl={imageUrl}
            orgName={org.name}
            industry={org.industry}
            isActive={org.is_active}
            onEdit={() => onEdit(org)}
            onAccess={() => onAccess(org)}
          />
        </div>

        <div 
          style={{ transform: 'translateZ(25px)' }}
          className="relative -mt-6 bg-white rounded-2xl p-4 shadow-lg mx-3 mb-3 z-10 border border-slate-100 flex-grow flex flex-col"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center border border-violet-100 shadow-sm">
                <Calendar size={18} className="text-violet-600" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valid Until</p>
                {org.access_valid_until ? (
                  <>
                    <p className="text-base font-bold text-violet-600">{daysLeft > 0 ? `in ${daysLeft} days` : 'Expired'}</p>
                    <p className="text-[10px] text-slate-400">Expires {expireFormatted}</p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-bold text-slate-600">Never Expires</p>
                    <p className="text-[10px] text-slate-400">Unlimited access</p>
                  </>
                )}
              </div>
            </div>
            {org.access_valid_until && daysLeft > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800 leading-none">{daysLeft}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Days</p>
              </div>
            )}
          </div>

          {org.access_valid_until && daysLeft > 0 && (
            <div className="w-full bg-slate-100 h-1.5 rounded-full mb-4 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
            <div className="text-center">
              <Shield size={14} className="mx-auto text-emerald-500 mb-1" />
              <p className="text-[8px] font-bold text-slate-400 uppercase">Status</p>
              <p className={`text-[10px] font-bold ${org.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>{org.is_active ? 'Active' : 'Inactive'}</p>
            </div>
            <div className="text-center border-l border-slate-100">
              <Zap size={14} className="mx-auto text-blue-500 mb-1" />
              <p className="text-[8px] font-bold text-slate-400 uppercase">Industry</p>
              <p className="text-[10px] font-bold text-blue-600 truncate px-1">{org.industry || '—'}</p>
            </div>
            <div className="text-center border-l border-slate-100">
              <Clock size={14} className="mx-auto text-purple-500 mb-1" />
              <p className="text-[8px] font-bold text-slate-400 uppercase">Created</p>
              <p className="text-[9px] font-bold text-slate-700">{createdDate}</p>
            </div>
          </div>
        </div>
      </TiltCard3D>
    </motion.div>
  );
}

const SuperAdminOrganizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const [editForm, setEditForm] = useState({ name: '', industry: '', image_url: '' });
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);
  const [accessForm, setAccessForm] = useState({ is_active: true, access_valid_until: '' });

  const fetchOrgs = async () => {
    setIsLoading(true);
    try {
      const data = await superAdminService.getAllOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load organizations');
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const filteredOrgs = useMemo(
    () => organizations.filter((org) => org.name?.toLowerCase().includes(searchQuery.toLowerCase())),
    [organizations, searchQuery]
  );

  const stats = useMemo(() => ({
    total: organizations.length,
    active: organizations.filter((o) => o.is_active).length,
    inactive: organizations.filter((o) => !o.is_active).length,
  }), [organizations]);

  const handleOpenEdit = (org) => {
    setSelectedOrg(org);
    setEditForm({ name: org.name || '', industry: org.industry || '', image_url: org.image_url || '' });
    setEditLogoFile(null);
    setEditLogoPreview(org.image_url ? resolveOrgImageUrl(org.image_url) : null);
    setPreviewError(false);
    setIsEditModalOpen(true);
  };

  const handleEditLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be 2MB or smaller');
      e.target.value = '';
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Logo must be PNG, JPEG, WebP, or SVG');
      e.target.value = '';
      return;
    }

    try {
      await validateOrgImageFile(file);
      setEditLogoFile(file);
      setPreviewError(false);

      const reader = new FileReader();
      reader.onload = (event) => {
        setEditLogoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not read image');
      e.target.value = '';
    }
  };

  const handleOpenAccess = (org) => {
    setSelectedOrg(org);
    setAccessForm({
      is_active: org.is_active,
      access_valid_until: org.access_valid_until ? new Date(org.access_valid_until).toISOString().slice(0, 16) : '',
    });
    setIsAccessModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrg?.id) return;
    if (!editForm.name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setIsEditingSubmitting(true);
    try {
      let finalImageUrl = editForm.image_url;

      if (editLogoFile && editLogoPreview) {
        finalImageUrl = editLogoPreview;
      }

      // Backend PATCH /super-admin/organizations/{id} expects a JSON dictionary
      const payload = {
        name: editForm.name.trim(),
        industry: editForm.industry?.trim() || '',
      };
      if (finalImageUrl) {
        payload.image_url = finalImageUrl;
      }

      await superAdminService.updateOrganization(selectedOrg.id, payload);
      toast.success('Organization updated successfully');
      setIsEditModalOpen(false);
      fetchOrgs();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Failed to update organization');
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        is_active: accessForm.is_active,
        access_valid_until: accessForm.access_valid_until ? new Date(accessForm.access_valid_until).toISOString() : null,
      };
      await superAdminService.updateOrganizationAccess(selectedOrg.id, payload);
      toast.success('Organization access updated successfully');
      setIsAccessModalOpen(false);
      fetchOrgs();
    } catch {
      toast.error('Failed to update access control');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative">
      {/* 3D Global Tenant Federation Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#090d16] via-[#13132b] to-[#1e1b4b] text-white p-6 md:p-8 mb-8 shadow-2xl border border-violet-500/30 min-h-[220px] flex flex-col justify-center"
      >
        {/* Cyber grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f110_1px,transparent_1px),linear-gradient(to_bottom,#6366f110_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

        {/* 3D Holographic Tenant Federation Nexus Canvas */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[50%] lg:w-[52%] h-full z-0 pointer-events-auto">
          <OrganizationsHero3D className="h-full w-full" />
        </div>

        <div className="relative z-10 max-w-lg pr-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-semibold mb-3.5 backdrop-blur-md shadow-sm">
            <Globe size={13} className="text-violet-400 animate-spin" style={{ animationDuration: '10s' }} />
            <span>Global Multi-Tenant Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Organizations <span className="bg-gradient-to-r from-violet-300 via-indigo-300 to-sky-300 bg-clip-text text-transparent">Directory</span>
          </h1>
          <p className="text-slate-300/90 text-sm sm:text-base mt-2 font-normal leading-relaxed">
            Govern tenant access permissions, licensing validity, and multi-tenant security architecture in real time.
          </p>
        </div>
      </motion.div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="pl-10 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-sm shadow-sm placeholder:text-slate-400"
            placeholder="Search organizations by name or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-violet-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-violet-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={18} />
            <span>Add Organization</span>
          </button>
        </div>
      </div>

      {/* 3D KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          {
            label: 'Total Tenants',
            value: stats.total,
            icon: Building2,
            iconBg: 'bg-violet-50 text-violet-600',
            color: 'text-slate-800',
            border: 'hover:border-violet-300',
            sub: 'Configured organizations',
          },
          {
            label: 'Active Tenants',
            value: stats.active,
            icon: Shield,
            iconBg: 'bg-emerald-50 text-emerald-600',
            color: 'text-emerald-600',
            border: 'hover:border-emerald-300',
            sub: 'Authorized & operational',
          },
          {
            label: 'Inactive Tenants',
            value: stats.inactive,
            icon: ShieldAlert,
            iconBg: 'bg-rose-50 text-rose-600',
            color: 'text-rose-600',
            border: 'hover:border-rose-300',
            sub: 'Suspended or expired',
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <TiltCard3D
              key={s.label}
              maxTilt={10}
              className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xl ${s.border} transition-all`}
            >
              <div className="flex items-center justify-between mb-2" style={{ transform: 'translateZ(18px)' }}>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{s.label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.iconBg} shadow-sm`}>
                  <Icon size={16} />
                </div>
              </div>
              <p className={`text-3xl font-black mt-1 tracking-tight ${s.color}`} style={{ transform: 'translateZ(26px)' }}>
                {s.value}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1" style={{ transform: 'translateZ(14px)' }}>
                {s.sub}
              </p>
            </TiltCard3D>
          );
        })}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-16 text-slate-500 gap-2">
              <Loader2 size={20} className="animate-spin" /> Loading organizations...
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
              <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No organizations found</p>
              <button onClick={() => setIsCreateModalOpen(true)} className="mt-4 text-violet-600 text-sm font-semibold hover:underline">
                Create your first organization
              </button>
            </div>
          ) : (
            filteredOrgs.map((org) => (
              <OrgCard key={org.id} org={org} onEdit={handleOpenEdit} onAccess={handleOpenAccess} />
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Industry</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Access Valid Until</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="5" className="text-center py-10 text-slate-500">Loading...</td></tr>
                ) : filteredOrgs.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-slate-500">No organizations found.</td></tr>
                ) : (
                  filteredOrgs.map((org) => {
                    const imageUrl = resolveOrgImageUrl(org.image_url);
                    return (
                      <tr key={org.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <OrgLogo
                              src={imageUrl}
                              alt={org.name}
                              className="w-14 h-10 rounded-lg border border-slate-200 shrink-0 overflow-hidden"
                            />
                            <p className="font-semibold text-slate-800">{org.name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{org.industry || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            org.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {org.is_active ? <Check size={12} /> : <X size={12} />}
                            {org.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {org.access_valid_until ? (
                            <div>
                              <span className="text-slate-800">{format(new Date(org.access_valid_until), 'MMM dd, yyyy')}</span>
                              <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(org.access_valid_until), { addSuffix: true })}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Never</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleOpenEdit(org)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleOpenAccess(org)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <ShieldAlert size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchOrgs}
      />

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg border border-slate-100 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 px-6 py-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Edit Organization</h2>
                    <p className="text-xs text-violet-100 mt-0.5">Update tenant identity, industry, and branding logo.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleEditSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Organization Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:outline-none"
                    placeholder="e.g. Acme Corp"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:outline-none"
                    placeholder="e.g. Technology, Healthcare, Finance"
                  />
                </div>

                {/* Organization Logo / Image Update */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Organization Logo / Branding <span className="text-slate-400 font-normal lowercase">(max 2MB)</span>
                  </label>
                  
                  <div className="space-y-3">
                    <label className="flex items-center justify-between px-4 py-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-violet-500 hover:bg-violet-50/40 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform shrink-0">
                          <Upload size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">
                            {editLogoFile ? editLogoFile.name : 'Upload new logo or banner'}
                          </p>
                          <p className="text-[10px] text-slate-400">PNG, JPEG, WebP · Square or Banner</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-violet-600 px-3 py-1 bg-violet-50 group-hover:bg-violet-600 group-hover:text-white rounded-lg transition-colors shrink-0">
                        Browse
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={handleEditLogoChange}
                      />
                    </label>

                    {/* Logo Preview */}
                    {editLogoPreview && (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50/80 p-4 flex flex-col items-center justify-center min-h-[120px]">
                        <div className="flex items-center justify-between w-full mb-2.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            {editLogoFile ? 'Selected Logo Preview' : 'Current Logo'}
                          </span>
                          {editLogoFile && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-sm">
                              ✓ Ready to upload
                            </span>
                          )}
                        </div>

                        {!previewError ? (
                          <div className="h-20 w-full max-w-[280px] bg-white rounded-xl border border-slate-200/80 p-2.5 flex items-center justify-center shadow-sm">
                            <img
                              key={editLogoPreview}
                              src={editLogoPreview}
                              alt="Organization Logo"
                              className="max-h-full max-w-full object-contain"
                              onError={() => setPreviewError(true)}
                            />
                          </div>
                        ) : (
                          <div className="h-20 w-full max-w-[280px] bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl border border-dashed border-violet-200 p-3 flex items-center justify-center text-slate-600 gap-2.5">
                            <Building2 size={20} className="text-violet-500" />
                            <span className="text-xs font-bold text-slate-800">{editForm.name || 'Organization Logo'}</span>
                          </div>
                        )}

                        {editLogoFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditLogoFile(null);
                              setEditLogoPreview(selectedOrg?.image_url ? resolveOrgImageUrl(selectedOrg.image_url) : null);
                              setPreviewError(false);
                            }}
                            className="mt-3 text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <X size={13} />
                            <span>Remove selected file</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditingSubmitting}
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/25 flex items-center gap-2 disabled:opacity-60 transition-all"
                  >
                    {isEditingSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Access Modal */}
      <AnimatePresence>
        {isAccessModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl"><ShieldAlert size={20} /></div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Access Control</h2>
                  <p className="text-xs text-slate-500">{selectedOrg?.name}</p>
                </div>
              </div>
              <form onSubmit={handleAccessSubmit} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="font-medium text-slate-800 block">Tenant Status</span>
                    <span className="text-xs text-slate-500">Enable or disable login access</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={accessForm.is_active} onChange={(e) => setAccessForm({ ...accessForm, is_active: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Access Valid Until</label>
                  <input type="datetime-local" value={accessForm.access_valid_until} onChange={(e) => setAccessForm({ ...accessForm, access_valid_until: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:outline-none" />
                  <p className="text-xs text-slate-500 mt-2">Leave empty for unlimited access.</p>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsAccessModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium">Update Access</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminOrganizations;
