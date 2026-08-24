import { useContext, useEffect, useRef, useState, useCallback } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { JDContext } from "../context/JDContext";
import { useLocation } from "react-router-dom";
import BroadcastAnnouncementModal from "../components/common/BroadcastAnnouncementModal";
import EmergencyLockdownScreen from "../components/common/EmergencyLockdownScreen";
import FeedbackPulseModal from "../components/common/FeedbackPulseModal";
import { filterUnseenBroadcasts, getActiveBroadcasts, isLockdownBroadcast } from "../services/broadcastService";
import {
  getFeedbackPrompt,
  markFeedbackPromptedThisSession,
  recordFeedbackSession,
  wasFeedbackPromptedThisSession,
} from "../services/feedbackService";
import { isOrgAdminRole, isHrRole, isManagerRole, isEndUserRole, isSuperAdminRole } from "../utils/roles";
import { ShieldAlert } from "lucide-react";

export default function PageLayout({ children }) {
  const { user } = useContext(JDContext);
  const location = useLocation();
  const mainRef = useRef(null);
  const [pendingBroadcasts, setPendingBroadcasts] = useState([]);
  const [activeLockdown, setActiveLockdown] = useState(null);
  const [feedbackPrompt, setFeedbackPrompt] = useState(null);
  const [feedbackTrigger, setFeedbackTrigger] = useState("session_milestone");
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const loadBroadcasts = useCallback(async () => {
    if (!user?.email) {
      setPendingBroadcasts([]);
      setActiveLockdown(null);
      return;
    }

    try {
      const active = await getActiveBroadcasts();
      const liveLockdown = (active || []).find((b) => isLockdownBroadcast(b));
      setActiveLockdown(liveLockdown || null);

      const unseen = filterUnseenBroadcasts(active, user);
      // One announcement per user — highest-priority first, never re-shown after dismiss
      const priority = ['alert', 'error', 'warning', 'info', 'success'];
      const sorted = [...unseen].sort(
        (a, b) => priority.indexOf((a.type || 'info').toLowerCase()) - priority.indexOf((b.type || 'info').toLowerCase())
      );
      setPendingBroadcasts(sorted.slice(0, 1));
    } catch (error) {
      console.error("Failed to load active broadcasts:", error);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    loadBroadcasts();
    const interval = setInterval(loadBroadcasts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadBroadcasts]);

  useEffect(() => {
    const onFeedbackPrompt = (event) => {
      const { prompt, trigger } = event.detail || {};
      if (prompt) {
        setFeedbackPrompt(prompt);
        setFeedbackTrigger(trigger || "session_milestone");
        setShowFeedback(true);
      }
    };
    window.addEventListener("tf:feedback-prompt", onFeedbackPrompt);
    return () => window.removeEventListener("tf:feedback-prompt", onFeedbackPrompt);
  }, []);

  useEffect(() => {
    if (!user?.email || isSuperAdminRole(user?.role)) return;

    let cancelled = false;
    let milestoneTimer;

    const bootstrapFeedback = async () => {
      try {
        await recordFeedbackSession();
        if (cancelled || wasFeedbackPromptedThisSession()) return;

        milestoneTimer = window.setTimeout(async () => {
          if (cancelled || wasFeedbackPromptedThisSession()) return;
          try {
            const result = await getFeedbackPrompt("session_milestone");
            if (result?.eligible && result?.prompt) {
              markFeedbackPromptedThisSession();
              setFeedbackPrompt(result.prompt);
              setFeedbackTrigger("session_milestone");
              setShowFeedback(true);
            }
          } catch (error) {
            console.error("Feedback milestone check failed:", error);
          }
        }, 55000);
      } catch (error) {
        console.error("Feedback session record failed:", error);
      }
    };

    bootstrapFeedback();
    return () => {
      cancelled = true;
      if (milestoneTimer) window.clearTimeout(milestoneTimer);
    };
  }, [user?.email, user?.id, user?.role]);

  const handleFeedbackClose = () => {
    setShowFeedback(false);
    setFeedbackPrompt(null);
  };

  const handleBroadcastDismiss = () => {
    setPendingBroadcasts((prev) => prev.slice(1));
  };

  const isSuperAdmin = isSuperAdminRole(user?.role);
  const isAdmin = isOrgAdminRole(user?.role);
  const isHR = isHrRole(user?.role);
  const isManager = isManagerRole(user?.role);
  const isEndUser = isEndUserRole(user?.role);

  // If lockdown is active and user is NOT Super Admin, show ONLY the Emergency Lockdown Screen after login
  if (activeLockdown && !isSuperAdmin) {
    return (
      <EmergencyLockdownScreen
        broadcast={activeLockdown}
        user={user}
        onRefresh={loadBroadcasts}
      />
    );
  }

  if (isSuperAdmin || isAdmin || isHR || isManager || isEndUser) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <BroadcastAnnouncementModal
          broadcasts={pendingBroadcasts}
          user={user}
          onDismiss={handleBroadcastDismiss}
        />
        <FeedbackPulseModal
          open={showFeedback}
          prompt={feedbackPrompt}
          trigger={feedbackTrigger}
          onClose={handleFeedbackClose}
        />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Active Lockdown Banner for Super Admin */}
          {activeLockdown && isSuperAdmin && (
            <div className="bg-rose-950 border-b border-rose-500/40 px-4 py-2 text-rose-200 text-xs flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert size={15} className="text-rose-400 animate-pulse" />
                <span>🚨 PLATFORM UNDER EMERGENCY LOCKDOWN: Non-SuperAdmin users are currently locked out.</span>
              </div>
              <span className="text-[10px] bg-rose-900/60 px-2 py-0.5 rounded border border-rose-500/30 uppercase font-extrabold">
                Super Admin Bypass Active
              </span>
            </div>
          )}
          <Navbar />
          <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden p-0 relative">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 transition-colors duration-300">
      <BroadcastAnnouncementModal
        broadcasts={pendingBroadcasts}
        user={user}
        onDismiss={handleBroadcastDismiss}
      />
      <FeedbackPulseModal
        open={showFeedback}
        prompt={feedbackPrompt}
        trigger={feedbackTrigger}
        onClose={handleFeedbackClose}
      />
      <Navbar />
      <div ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {children}
      </div>
    </div>
  );
}
