import React from 'react';
import { User, Shield, Briefcase, MapPin } from 'lucide-react';

export default function ProfileBadge({ user, className = "" }) {
  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className={`flex items-center gap-3 p-2 pr-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/10 transition-all cursor-default group ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
        {getInitials(user.full_name)}
      </div>
      
      <div className="flex flex-col">
        <span className="text-xs font-black text-white tracking-tight leading-none mb-1">
          {user.full_name}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-indigo-200/70 uppercase tracking-widest flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" /> {user.role}
          </span>
          {user.org_name && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-slate-600" /> {user.org_name}
            </span>
          )}
        </div>
      </div>

      {/* Hover Info Tooltip */}
      <div className="absolute top-full mt-2 left-0 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all z-50">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Organization</p>
              <p className="text-xs text-white font-bold">{user.org_name || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Region</p>
              <p className="text-xs text-white font-bold">{user.country || 'Unknown'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-white/5 pt-3 mt-1">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Email Address</p>
              <p className="text-xs text-white font-bold truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
