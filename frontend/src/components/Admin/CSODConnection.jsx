import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wifi,
  Settings,
  RefreshCw,
  Globe,
  Shield,
  X,
  Database,
  Link2,
  Key,
  Layers,
  Activity,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  Server,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../services/apiClient";
import { toast } from "react-hot-toast";

export default function CSODConnection({ onSaveSuccess, onStatusChange, activeConnection }) {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(!activeConnection);

  const [connection, setConnection] = useState(activeConnection || {
    connection_name: "",
    base_url: "",
    auth_token_url: "",
    client_id: "",
    client_secret: "",
    scope: "",
    export_type: "Foundation",
    status: "disconnected", // 'connected' | 'error' | 'disconnected' | 'pending'
    lastTested: "Never"
  });

  const [formData, setFormData] = useState({ ...connection });

  const extractErrorMessage = (msg) => {
    if (!msg) return "Gateway connection failed. Please verify your network and settings.";
    
    const codeMatch = msg.match(/'code':\s*'([^']+)'/);
    const descMatch = msg.match(/'description':\s*'([^']+)'/);
    
    if (codeMatch && descMatch) {
      const code = codeMatch[1];
      const desc = descMatch[1];
      
      switch (code) {
        case 'unauthorized_client':
        case 'invalid_client':
          return "Invalid credentials. Please verify your Client ID and Client Secret.";
        case 'invalid_grant':
          return "Authentication failed. The gateway rejected the connection request.";
        case 'invalid_scope':
          return "Unauthorized API Scope. Please verify the requested scopes in your settings.";
        case 'access_denied':
          return "Access denied by the gateway. Ensure your account has sufficient permissions.";
        default:
          return `Connection Error: ${desc}`;
      }
    }
    
    if (msg.includes("Network Error")) {
      return "Unable to reach the gateway. Please check the Base URL and your internet connection.";
    }
    
    if (msg.includes("Auth failed:")) {
      return "Authentication failed. Please check your gateway credentials and endpoints.";
    }
    
    return msg;
  };

  const handleTestConnectionAuto = async (connObj) => {
    setIsTesting(true);
    setConnection(prev => ({ ...prev, status: "pending" }));
    try {
      const response = await apiPost("/csod/test-connection");
      if (response.success) {
        const updated = {
          ...connObj,
          status: "connected",
          lastTested: new Date().toLocaleString('en-US', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
          })
        };
        setConnection(updated);
        toast.success("Gateway connection secured!");
        if (onStatusChange) onStatusChange(updated);
      } else {
        setConnection(prev => ({ ...prev, status: "error" }));
        toast.error(extractErrorMessage(response.message));
        if (onStatusChange) onStatusChange(false);
      }
    } catch (error) {
      console.error("Test Connection Error:", error);
      setConnection(prev => ({ ...prev, status: "error" }));
      toast.error(extractErrorMessage(error.message));
      if (onStatusChange) onStatusChange(false);
    } finally {
      setIsTesting(false);
    }
  };

  // Fetch initial status
  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const response = await apiGet("/csod/status");
      if (response && response.connections && response.connections.length > 0) {
        const conn = response.connections[0];
        const details = await apiGet(`/csod/connection/${conn.connection_name}`);
        const updatedConn = {
          ...details,
          status: details.status || (response.connected ? "connected" : "pending"),
          lastTested: details.last_tested_at
            ? new Date(details.last_tested_at).toLocaleString('en-US', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            })
            : "Never"
        };
        setConnection(updatedConn);
        setFormData(updatedConn);
        
        // Automatically test connection on initial load
        await handleTestConnectionAuto(updatedConn);
      } else {
        setConnection(prev => ({ ...prev, status: "disconnected" }));
        if (onStatusChange) onStatusChange(false);
      }
    } catch (error) {
      console.error("Failed to fetch CSOD status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeConnection) {
      fetchStatus();
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    setIsSaving(true);
    const loadingToast = toast.loading("Saving configuration...");

    try {
      const payload = {
        connection_name: formData.connection_name,
        base_url: formData.base_url,
        auth_token_url: formData.auth_token_url,
        scope: formData.scope,
        export_type: formData.export_type,
        default_openings: formData.default_openings || 1,
        default_expiry_days: formData.default_expiry_days || 90,
        default_country: formData.default_country || "US"
      };

      if (formData.client_id && !formData.client_id.includes('****')) {
        payload.client_id = formData.client_id;
      }
      if (formData.client_secret && !formData.client_secret.includes('****')) {
        payload.client_secret = formData.client_secret;
      }

      if (connection.connection_name) {
        await apiPatch(`/csod/connection/${connection.connection_name}`, payload);
      } else {
        await apiPost("/csod/connect", payload);
      }

      toast.success("Connection saved successfully!", { id: loadingToast });
      setShowModal(false);
      fetchStatus();
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error("CSOD Save Error:", error);
      toast.error(error.message || "Failed to save connection", { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConnection = async () => {
    if (!window.confirm("Are you sure you want to delete this connection?")) return;

    const loadingToast = toast.loading("Deleting connection...");
    try {
      await apiDelete(`/csod/connection/${connection.connection_name}`);
      toast.success("Connection deleted", { id: loadingToast });
      setConnection({
        connection_name: "",
        base_url: "",
        auth_token_url: "",
        client_id: "",
        client_secret: "",
        scope: "",
        export_type: "Foundation",
        status: "disconnected",
        lastTested: "Never"
      });
      setFormData({
        connection_name: "",
        base_url: "",
        auth_token_url: "",
        client_id: "",
        client_secret: "",
        scope: "",
        export_type: "Foundation",
        status: "disconnected",
        lastTested: "Never"
      });
      if (onStatusChange) onStatusChange(false);
    } catch (error) {
      toast.error("Failed to delete connection", { id: loadingToast });
    }
  };

  const handleTestConnection = async () => {
    if (!connection.connection_name) {
      setShowModal(true);
      return;
    }

    setIsTesting(true);
    const loadingToast = toast.loading("Testing connection...");

    try {
      const response = await apiPost("/csod/test-connection");

      if (response.success) {
        toast.success(response.message || "Connection Successful!", { id: loadingToast });
        const updated = {
          ...connection,
          status: "connected",
          lastTested: new Date().toLocaleString('en-US', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
          })
        };
        setConnection(updated);
        if (onStatusChange) onStatusChange(updated);
      } else {
        throw new Error(response.message || "Test failed");
      }
    } catch (error) {
      console.error("Test Connection Error:", error);
      toast.error(error.message || "Test failed. Please check credentials.", { id: loadingToast });
      setConnection(prev => ({ ...prev, status: "error" }));
      if (onStatusChange) onStatusChange(false);
    } finally {
      setIsTesting(false);
    }
  };



  // Holographic layout state colors
  const getHoloConfig = () => {
    const effectiveStatus = isLoading ? "pending" : connection.status;
    switch (effectiveStatus) {
      case "connected":
        return {
          glow: "border-emerald-500/20 shadow-emerald-500/10",
          core: "bg-emerald-500 shadow-[0_0_15px_#10b981]",
          label: "PORT SECURED",
          textColor: "text-emerald-500",
          ringColor: "text-emerald-500/25",
          ringSpeed: "animate-spin-slow"
        };
      case "pending":
      case "active":
        return {
          glow: "border-amber-500/20 shadow-amber-500/10",
          core: "bg-amber-500 shadow-[0_0_15px_#f59e0b] animate-pulse",
          label: isLoading ? "LOADING PROFILE..." : isTesting ? "TESTING CONNECTION..." : "AUTHORIZING...",
          textColor: "text-amber-500",
          ringColor: "text-amber-500/25",
          ringSpeed: "animate-spin-slow"
        };
      case "error":
        return {
          glow: "border-rose-500/20 shadow-rose-500/10",
          core: "bg-rose-500 shadow-[0_0_15px_#ef4444]",
          label: "PORT INOPERABLE",
          textColor: "text-rose-500",
          ringColor: "text-rose-500/20",
          ringSpeed: ""
        };
      default:
        return {
          glow: "border-slate-200 dark:border-white/5",
          core: "bg-slate-300 dark:bg-white/10",
          label: "PORT DORMANT",
          textColor: "text-slate-400 dark:text-slate-500",
          ringColor: "text-slate-200 dark:text-white/5",
          ringSpeed: ""
        };
    }
  };

  const holo = getHoloConfig();

  return (
    <div className={`
      bg-white dark:bg-[#0f172a] rounded-[1rem] border border-slate-200 dark:border-white/10 p-6 shadow-sm space-y-6 transition-all duration-500 hover:shadow-lg
      ${holo.glow}
    `}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes radarPulse {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        .animate-radar-wave-1 {
          animation: radarPulse 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
        }
        .animate-radar-wave-2 {
          animation: radarPulse 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
          animation-delay: 1s;
        }
        .animate-radar-wave-3 {
          animation: radarPulse 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
          animation-delay: 2s;
        }
      `}} />

      {/* Futuristic Holographic Ring Scanner */}
      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#070b13] border border-slate-100 dark:border-slate-800/80 rounded-[2rem] relative overflow-hidden h-[150px]">
        {/* Widescreen Ambient Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3341550a_1px,transparent_1px),linear-gradient(to_bottom,#3341550a_1px,transparent_1px)] bg-[size:10px_10px]" />



        {/* Hologram SVG layers */}
        <div className="relative w-28 h-28 flex items-center justify-center z-10">

          {/* Holographic Radar Waves */}
          {connection.status !== 'disconnected' && (
            <>
              <div className={`absolute inset-0 m-auto w-11 h-11 rounded-full border-2 border-dashed border-current/70 opacity-0 pointer-events-none animate-radar-wave-1 ${holo.textColor}`} />
              <div className={`absolute inset-0 m-auto w-11 h-11 rounded-full border-2 border-dashed border-current/70 opacity-0 pointer-events-none animate-radar-wave-2 ${holo.textColor}`} />
              <div className={`absolute inset-0 m-auto w-11 h-11 rounded-full border-2 border-dashed border-current/70 opacity-0 pointer-events-none animate-radar-wave-3 ${holo.textColor}`} />
            </>
          )}

          {/* Inner core capsule */}
          <div className={`
            w-11 h-11 rounded-full flex items-center justify-center transition-all duration-1000 z-10
            ${holo.core}
          `}>
            <Wifi className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Live HUD telemetry signal */}
        <div className="relative z-10 text-center mt-2.5">
          <span className={`font-mono text-[9px] font-black tracking-widest uppercase ${holo.textColor}`}>
            {holo.label}
          </span>
        </div>
      </div>

      {/* Profile Details Block */}
      <div className="space-y-4">
        {/* Connection Profile Terminal */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
            <span>Gateway Client</span>
            <span className="font-mono text-[8px]">{connection.export_type} Module</span>
          </div>
          <div className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-inner">
            <p className="font-mono text-[10px] text-slate-200 truncate">
              {connection.connection_name || "DORMANT PROFILE"}
            </p>
          </div>
        </div>

        {/* API Endpoint Terminal */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
            <span>Secure Port Address</span>
            <span className="font-mono text-[8px]">HTTPS 443</span>
          </div>
          <div
            onClick={() => {
              if (connection.base_url) {
                navigator.clipboard.writeText(connection.base_url);
                toast.success("Copied gateway URL to clipboard!");
              }
            }}
            title="Click to copy URL"
            className="group w-full bg-slate-900 border border-slate-800 hover:border-slate-700/80 p-3 rounded-xl flex items-center justify-between shadow-inner cursor-pointer transition-colors duration-300"
          >
            <span className="font-mono text-[10px] text-slate-300 truncate pr-2 select-all">
              {connection.base_url || "https://unverified-port.csod.com"}
            </span>
            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-blue-400 transition-colors" />
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <Activity className={`w-3.5 h-3.5 ${connection.status === 'connected' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="font-bold">Sync Timestamp</span>
          </div>
          <span className="font-mono text-[9px] text-slate-600 dark:text-slate-300">
            {connection.lastTested || "Never"}
          </span>
        </div>
      </div>

      {/* Cyberpunk Action Buttons */}
      <div className="space-y-2 pt-2">
        {(connection.status === "error" || isTesting) && (
          <button
            onClick={() => handleTestConnectionAuto(connection)}
            disabled={isTesting || isSaving}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 border rounded-xl text-xs font-bold transition-all shadow-sm ${
              isTesting 
                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 cursor-not-allowed" 
                : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 active:scale-[0.98]"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? "Testing Connection..." : "Retry Connection"}
          </button>
        )}

        <button
          onClick={() => {
            setFormData({ ...connection });
            setShowModal(true);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-[0.98]"
        >
          <Settings className="w-3.5 h-3.5" />
          Gateway Profile Settings
        </button>
      </div>

      {/* Setup Modal rendered via React Portal to prevent sidebar z-index stacking bugs */}
      {createPortal(
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSaving && setShowModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-xl bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 z-10"
              >
                {/* Modal Header */}
                <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">CSOD Configuration</h2>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Enterprise API Gateway Settings</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={isSaving}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all text-slate-400 disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                  <form onSubmit={handleSave} className="space-y-6">
                    {/* Connection Profile */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Connection Name</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="connection_name"
                            value={formData.connection_name}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl focus:ring-2 ring-blue-500/20 dark:text-white transition-all text-sm font-medium"
                            placeholder="e.g. CSOD Production Environment"
                          />
                          <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Export Type</label>
                        <div className="p-1 bg-slate-100 dark:bg-white/5 rounded-xl flex relative h-[42px]">
                          <motion.div
                            className="absolute inset-1 bg-white dark:bg-white/10 rounded-lg shadow-sm"
                            initial={false}
                            animate={{
                              x: formData.export_type === "Foundation" ? 0 : "100%",
                              width: "calc(50% - 4px)"
                            }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />

                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, export_type: "Foundation" }))}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-2 text-xs font-bold transition-colors ${formData.export_type === "Foundation" ? "text-blue-600 dark:text-white" : "text-slate-400"}`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            Foundation
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, export_type: "Bulk" }))}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-2 text-xs font-bold transition-colors ${formData.export_type === "Bulk" ? "text-blue-600 dark:text-white" : "text-slate-400"}`}
                          >
                            <Database className="w-3.5 h-3.5" />
                            Bulk
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Endpoints */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Base URL</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="base_url"
                            value={formData.base_url}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl focus:ring-2 ring-indigo-500/20 dark:text-white transition-all text-sm font-medium"
                            placeholder="e.g. https://corp.csod.com"
                          />
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Auth Token URL</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="auth_token_url"
                            value={formData.auth_token_url}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl focus:ring-2 ring-indigo-500/20 dark:text-white transition-all text-sm font-medium"
                            placeholder="e.g. https://corp.csod.com/services/api/oauth2/token"
                          />
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* Security */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Client ID</label>
                          <div className="relative">
                            <input
                              type={showClientId ? "text" : "password"}
                              name="client_id"
                              value={formData.client_id}
                              onChange={handleInputChange}
                              required
                              className="w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl focus:ring-2 ring-emerald-500/20 dark:text-white transition-all text-sm font-medium"
                              placeholder="Enter your API Client ID"
                            />
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <button
                              type="button"
                              onClick={() => setShowClientId(!showClientId)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            >
                              {showClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Client Secret</label>
                          <div className="relative">
                            <input
                              type={showClientSecret ? "text" : "password"}
                              name="client_secret"
                              value={formData.client_secret}
                              onChange={handleInputChange}
                              required
                              className="w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl focus:ring-2 ring-emerald-500/20 dark:text-white transition-all text-sm font-medium"
                              placeholder="Enter your API Client Secret"
                            />
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <button
                              type="button"
                              onClick={() => setShowClientSecret(!showClientSecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            >
                              {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Scope</label>
                        <div className="relative">
                          <textarea
                            name="scope"
                            value={formData.scope}
                            onChange={handleInputChange}
                            required
                            rows="2"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl focus:ring-2 ring-emerald-500/20 dark:text-white transition-all text-[12px] font-medium resize-none leading-relaxed"
                            placeholder="e.g. ou:read ou:write ou:update..."
                          />
                          <Layers className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-6 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowModal(false)}
                      disabled={isSaving}
                      className="py-3 px-4 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>

                    {connection.connection_name && (
                      <button
                        type="button"
                        onClick={handleDeleteConnection}
                        disabled={isSaving}
                        className="flex items-center gap-2 py-3 px-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl font-bold text-xs transition-all active:scale-[0.98]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Connection
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={
                      isSaving ||
                      !formData.connection_name ||
                      !formData.base_url ||
                      !formData.auth_token_url ||
                      !formData.client_id ||
                      !formData.client_secret ||
                      !formData.scope ||
                      !formData.export_type
                    }
                    className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {isSaving
                      ? "Processing..."
                      : connection.connection_name
                        ? "Update Configuration"
                        : "Create Connection"
                    }
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}