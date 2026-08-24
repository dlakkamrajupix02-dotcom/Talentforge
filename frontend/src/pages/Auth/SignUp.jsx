import React, { useState, useEffect } from 'react';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap,
  Database, CheckCircle2, RefreshCw, Sparkles, Shield, FileOutput,
  Building2, Briefcase
} from 'lucide-react';
import { signupSchema } from '../schemas/authSchema';
import { Link, useNavigate } from 'react-router-dom';
import * as authService from '../../services/authService';

import { toast } from 'react-hot-toast';

/* ─── Pipeline data (Consistent with SignIn.jsx) ────────────────────────── */
const NODES = [
  { id: 'legacy',    x: 16, y: 20, icon: Database,    label: 'Legacy',      color: '#38bdf8' },
  { id: 'import',   x: 50, y: 10, icon: FileOutput,   label: 'Import',    color: '#38bdf8' },
  { id: 'validate', x: 80, y: 24, icon: Shield,       label: 'Validate',  color: '#34d399' },
  { id: 'ai',       x: 18, y: 58, icon: Sparkles,     label: 'AI Gen',    color: '#a78bfa' },
  { id: 'transform',x: 60, y: 54, icon: RefreshCw,    label: 'Transform', color: '#60a5fa' },
  { id: 'preview',  x: 35, y: 82, icon: CheckCircle2, label: 'Preview',   color: '#f472b6' },
  { id: 'target',   x: 82, y: 78, icon: Database,     label: 'Target',      color: '#38bdf8' },
];

const CONNECTIONS = [
  { from: 'legacy',    to: 'import',    color: '#38bdf8' },
  { from: 'import',    to: 'validate',  color: '#38bdf8' },
  { from: 'import',    to: 'ai',        color: '#38bdf8' },
  { from: 'validate',  to: 'transform', color: '#34d399' },
  { from: 'ai',        to: 'transform', color: '#a78bfa' },
  { from: 'transform', to: 'preview',   color: '#60a5fa' },
  { from: 'preview',   to: 'target',      color: '#f472b6' },
];

const getNode = (id) => NODES.find(n => n.id === id);

/* ── Animation canvas (Consistent with SignIn.jsx) ───────────────────────── */
const PipelineCanvas = () => {
  const [activeConns, setActiveConns] = useState([]);
  const [litNodes,    setLitNodes]    = useState([]);

  const runAnimation = () => {
    setActiveConns([]);
    setLitNodes([]);
    CONNECTIONS.forEach((conn, idx) => {
      setTimeout(() => {
        setActiveConns(prev => [...prev, idx]);
        setLitNodes(prev => [...new Set([...prev, conn.from, conn.to])]);
      }, idx * 650);
    });
  };

  useEffect(() => {
    const t    = setTimeout(runAnimation, 500);
    const loop = setInterval(runAnimation, 7500);
    return () => { clearTimeout(t); clearInterval(loop); };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Grid texture moved to outer wrapper */}

      {/* Ambient glows */}
      <div style={{
        position: 'absolute', top: '15%', left: '25%',
        width: 240, height: 240, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle,rgba(56,189,248,0.055) 0%,transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%',
        width: 180, height: 180, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle,rgba(167,139,250,0.045) 0%,transparent 70%)',
      }} />

      {/* SVG: connection lines */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {CONNECTIONS.map((c, i) => {
            const f = getNode(c.from), t = getNode(c.to);
            return (
              <linearGradient key={i} id={`lg${i}`}
                x1={f.x} y1={f.y} x2={t.x} y2={t.y} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor={c.color} stopOpacity="0" />
                <stop offset="45%"  stopColor={c.color} stopOpacity="0.6" />
                <stop offset="100%" stopColor={c.color} stopOpacity="0.1" />
              </linearGradient>
            );
          })}
        </defs>
        {CONNECTIONS.map((c, i) => {
          const f = getNode(c.from), t = getNode(c.to);
          return (
            <line key={`r${i}`}
              x1={f.x} y1={f.y} x2={t.x} y2={t.y}
              stroke="rgba(148,163,184,0.07)" strokeWidth="0.3" />
          );
        })}
        {CONNECTIONS.map((c, i) => {
          if (!activeConns.includes(i)) return null;
          const f = getNode(c.from), t = getNode(c.to);
          const len = Math.hypot(t.x - f.x, t.y - f.y);
          return (
            <g key={`a${i}`}>
              <line x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                stroke={c.color} strokeWidth="1.2" opacity="0.07" />
              <line x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                stroke={`url(#lg${i})`} strokeWidth="0.4"
                style={{
                  strokeDasharray: len,
                  strokeDashoffset: len,
                  animation: 'drawLine 0.85s ease-out forwards',
                }} />
              <circle r="0.55" fill={c.color} opacity="0.9">
                <animateMotion dur="0.85s" repeatCount="1"
                  path={`M${f.x},${f.y} L${t.x},${t.y}`} />
                <animate attributeName="opacity" values="0;1;1;0" dur="0.85s" repeatCount="1" />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* HTML nodes */}
      {NODES.map(node => {
        const isLit = litNodes.includes(node.id);
        const Icon  = node.icon;
        return (
          <div key={node.id} style={{
            position: 'absolute',
            left: `${node.x}%`,
            top:  `${node.y}%`,
            transform: 'translate(-50%,-50%)',
          }}>
            {isLit && (
              <div style={{
                position: 'absolute',
                width: 46, height: 46,
                top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                borderRadius: '50%',
                pointerEvents: 'none',
                background: `radial-gradient(circle,${node.color}1a 0%,transparent 70%)`,
                animation: 'nodePulse 1.6s ease-out',
              }} />
            )}
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isLit ? `${node.color}12` : 'rgba(8,12,20,0.8)',
              border: `1px solid ${isLit ? node.color + '45' : 'rgba(148,163,184,0.11)'}`,
              transition: 'background 0.4s, border-color 0.4s',
              backdropFilter: 'blur(4px)',
            }}>
              <Icon size={14} style={{
                color: isLit ? node.color : 'rgba(148,163,184,0.35)',
                transition: 'color 0.4s',
              }} />
            </div>
            <div style={{
              position: 'absolute',
              top: '100%', left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 5, fontSize: 10, fontWeight: 500,
              letterSpacing: '0.04em', whiteSpace: 'nowrap',
              color: isLit ? node.color : 'rgba(100,116,139,0.55)',
              transition: 'color 0.4s',
            }}>
              {node.label}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes drawLine  { to { stroke-dashoffset: 0; } }
        @keyframes nodePulse {
          0%   { transform: translate(-50%,-50%) scale(0.8); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/* ══ Main component ════════════════════════════════════════════════════════ */
const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    password: '', 
    confirm_password: '',
    role: '',
    company_name: ''
  });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);

  const handleInput = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signupSchema.validate(formData, { abortEarly: false });
      await authService.signup(formData);
      toast.success("Signup successful! Please log in.");
      navigate("/login");
    } catch (err) {
      if (err.inner) {
        const newErrors = {};
        err.inner.forEach(error => { newErrors[error.path] = error.message; });
        setErrors(newErrors);
      } else {
        setErrors({ general: err.message || "Signup failed" });
      }
    }
  };

  return (
    <div className="min-h-screen flex" style={{ 
      backgroundColor: '#060a10',
      backgroundImage:
        'linear-gradient(rgba(148,163,184,0.03) 1px,transparent 1px),' +
        'linear-gradient(90deg,rgba(148,163,184,0.03) 1px,transparent 1px)',
      backgroundSize: '36px 36px',
    }}>
      
      {/* ══ LEFT PANEL ══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col" style={{
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}>
        <div className="flex items-center gap-2.5 flex-shrink-0" style={{ padding: '26px 30px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={15} color="#fff" />
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, letterSpacing: '0.02em' }}>TalentForge</div>
            <div style={{ color: '#334155', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Platform</div>
          </div>
        </div>

        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <PipelineCanvas />
        </div>

        <div className="flex-shrink-0" style={{ padding: '20px 28px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: '#334155', textTransform: 'uppercase', marginBottom: 5 }}>
              Registration Flow
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
              Cross-Platform Transformation
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
              Join 500+ HR Teams migrating with AI
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(148,163,184,0.07)', marginBottom: 14 }} />

          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { value: '3,00,000+',  label: 'JDs Migrated',   color: '#38bdf8' },
              { value: '99.8%',   label: 'Integrity Rate', color: '#34d399' },
              { value: '6×',      label: 'Faster',         color: '#a78bfa' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', borderRadius: 9,
                padding: '9px 8px',
                background: 'rgba(15,23,42,0.5)',
                border: '1px solid rgba(148,163,184,0.07)',
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9.5, color: '#475569', marginTop: 2, letterSpacing: '0.03em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — form ══════════════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center overflow-y-auto relative z-10" style={{
        padding: '32px 24px',
        backgroundColor: 'transparent',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          
          <div className="flex lg:hidden items-center gap-2.5" style={{ marginBottom: 28 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={15} color="#fff" />
            </div>
            <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>TalentForge</span>
          </div>

          <div style={{
            display: 'flex', padding: 4,
            background: 'rgba(15,23,42,0.8)',
            borderRadius: 12, border: '1px solid rgba(148,163,184,0.1)',
            marginBottom: 28,
          }}>
            <Link to="/login" style={{
              flex: 1, padding: '9px 16px', borderRadius: 9,
              color: '#64748b', fontWeight: 500, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
            }}>
              Sign In
            </Link>
            <button style={{
              flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#06b6d4,#2563eb)',
              color: '#fff', fontWeight: 600, fontSize: 13,
              boxShadow: '0 4px 14px rgba(6,182,212,0.2)', cursor: 'pointer',
            }}>
              Create Account
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px', lineHeight: 1.25 }}>
              Begin your<br />
              <span style={{
                background: 'linear-gradient(90deg,#38bdf8,#60a5fa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                TalentForge Journey
              </span>
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Create your account to start automating your cross-platform migrations.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 600,
                color: '#475569', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 7,
              }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  color: errors.full_name ? '#f87171' : '#475569',
                  pointerEvents: 'none',
                }} />
                <input
                  name="full_name" type="text"
                  value={formData.full_name} onChange={handleInput}
                  placeholder="John Doe"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 42, paddingRight: 14,
                    paddingTop: 12, paddingBottom: 12,
                    background: 'rgba(15,23,42,0.5)',
                    border: `1px solid ${errors.full_name ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.12)'}`,
                    borderRadius: 11, fontSize: 13, color: '#e2e8f0',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { if (!errors.full_name) e.target.style.borderColor = 'rgba(56,189,248,0.4)'; }}
                  onBlur={e  => { if (!errors.full_name) e.target.style.borderColor = 'rgba(148,163,184,0.12)'; }}
                />
              </div>
              {errors.full_name && <p style={{ margin: '5px 0 0 4px', fontSize: 11, color: '#f87171' }}>{errors.full_name}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: 10, fontWeight: 600,
                  color: '#475569', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 7,
                }}>
                  Company Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={15} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: errors.company_name ? '#f87171' : '#475569',
                    pointerEvents: 'none',
                  }} />
                  <input
                    name="company_name" type="text"
                    value={formData.company_name} onChange={handleInput}
                    placeholder="Phenomecloud"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: 42, paddingRight: 14,
                      paddingTop: 12, paddingBottom: 12,
                      background: 'rgba(15,23,42,0.5)',
                      border: `1px solid ${errors.company_name ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.12)'}`,
                      borderRadius: 11, fontSize: 13, color: '#e2e8f0',
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                {errors.company_name && <p style={{ margin: '5px 0 0 4px', fontSize: 11, color: '#f87171' }}>{errors.company_name}</p>}
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: 10, fontWeight: 600,
                  color: '#475569', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 7,
                }}>
                  Select Role
                </label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={15} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: errors.role ? '#f87171' : '#475569',
                    pointerEvents: 'none',
                  }} />
                  <select
                    name="role"
                    value={formData.role} onChange={handleInput}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: 42, paddingRight: 14,
                      paddingTop: 12, paddingBottom: 12,
                      background: 'rgba(15,23,42,0.5)',
                      border: `1px solid ${errors.role ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.12)'}`,
                      borderRadius: 11, fontSize: 13, color: formData.role ? '#e2e8f0' : '#475569',
                      outline: 'none', transition: 'border-color 0.2s',
                      appearance: 'none',
                    }}
                  >
                    <option value="" disabled>Select Role</option>
                    <option value="Admin">Admin</option>
                    <option value="HR">HR</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                {errors.role && <p style={{ margin: '5px 0 0 4px', fontSize: 11, color: '#f87171' }}>{errors.role}</p>}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 600,
                color: '#475569', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 7,
              }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  color: errors.email ? '#f87171' : '#475569',
                  pointerEvents: 'none',
                }} />
                <input
                  name="email" type="email"
                  value={formData.email} onChange={handleInput}
                  placeholder="sarah.mitchell@company.com"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 42, paddingRight: 14,
                    paddingTop: 12, paddingBottom: 12,
                    background: 'rgba(15,23,42,0.5)',
                    border: `1px solid ${errors.email ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.12)'}`,
                    borderRadius: 11, fontSize: 13, color: '#e2e8f0',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { if (!errors.email) e.target.style.borderColor = 'rgba(56,189,248,0.4)'; }}
                  onBlur={e  => { if (!errors.email) e.target.style.borderColor = 'rgba(148,163,184,0.12)'; }}
                />
              </div>
              {errors.email && <p style={{ margin: '5px 0 0 4px', fontSize: 11, color: '#f87171' }}>{errors.email}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: 10, fontWeight: 600,
                  color: '#475569', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 7,
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: errors.password ? '#f87171' : '#475569',
                    pointerEvents: 'none',
                  }} />
                  <input
                    name="password" type={showPass ? 'text' : 'password'}
                    value={formData.password} onChange={handleInput}
                    placeholder="••••••••"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: 42, paddingRight: 38,
                      paddingTop: 12, paddingBottom: 12,
                      background: 'rgba(15,23,42,0.5)',
                      border: `1px solid ${errors.password ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.12)'}`,
                      borderRadius: 11, fontSize: 13, color: '#e2e8f0',
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#475569', display: 'flex'
                  }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p style={{ margin: '5px 0 0 4px', fontSize: 11, color: '#f87171' }}>{errors.password}</p>}
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: 10, fontWeight: 600,
                  color: '#475569', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 7,
                }}>
                   Confirm
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: errors.confirm_password ? '#f87171' : '#475569',
                    pointerEvents: 'none',
                  }} />
                  <input
                    name="confirm_password" type="password"
                    value={formData.confirm_password} onChange={handleInput}
                    placeholder="••••••••"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      paddingLeft: 42, paddingRight: 14,
                      paddingTop: 12, paddingBottom: 12,
                      background: 'rgba(15,23,42,0.5)',
                      border: `1px solid ${errors.confirm_password ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.12)'}`,
                      borderRadius: 11, fontSize: 13, color: '#e2e8f0',
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                {errors.confirm_password && <p style={{ margin: '5px 0 0 4px', fontSize: 11, color: '#f87171' }}>{errors.confirm_password}</p>}
              </div>
            </div>

            {errors.general && (
              <p style={{ margin: 0, fontSize: 12, color: '#f87171', textAlign: 'center' }}>{errors.general}</p>
            )}

            <button type="submit" style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg,#06b6d4,#2563eb)',
              border: 'none', borderRadius: 11,
              color: '#fff', fontWeight: 600, fontSize: 14,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 18px rgba(6,182,212,0.22)',
              transition: 'opacity 0.2s',
              marginTop: 8
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Start Your Migration <ArrowRight size={15} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.1)' }} />
              <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.1)' }} />
            </div>

            <button type="button" style={{
              width: '100%', padding: '12px',
              background: 'rgba(15,23,42,0.5)',
              border: '1px solid rgba(148,163,184,0.12)',
              borderRadius: 11, color: '#94a3b8', fontWeight: 500, fontSize: 13,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Shield size={14} /> Continue with Enterprise SSO
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#475569' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#38bdf8', fontWeight: 500, textDecoration: 'none' }}>
                Return to Login
              </Link>
            </p>
            <Link to="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: '#475569', textDecoration: 'none',
            }}>
              <ArrowRight size={12} style={{ transform: 'rotate(180deg)' }} />
              Back to TalentForge homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;