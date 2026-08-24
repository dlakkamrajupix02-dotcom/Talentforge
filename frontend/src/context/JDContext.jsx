import { createContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { sanitizeStableContent } from "../utils/formatJD";
import * as authService from "../services/authService";
import * as jdService from "../services/jdService";
import * as workflowService from "../services/workflowService";
import * as organizationService from "../services/organizationService";
import { enrichUserProfile, inferCountryFromTimeZone } from "../utils/locationHelper";
import { setAccessToken, clearAccessToken } from "../services/apiClient";

export const JDContext = createContext();

export const JDProvider = ({ children }) => {
  const refreshTimeoutRef = useRef(null);
  const sessionLimitTimeoutRef = useRef(null);
  const MAX_SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

  const [pushQueue, setPushQueue] = useState(() => {
    const stored = localStorage.getItem("jdforge_push_queue");
    return stored ? JSON.parse(stored) : [];
  });

  const [pushHistory, setPushHistory] = useState(() => {
    const stored = localStorage.getItem("jdforge_push_history");
    return stored ? JSON.parse(stored) : [];
  });

  const [departments, setDepartments] = useState(() => {
    try {
      const stored = localStorage.getItem("jdforge_departments");
      return (stored && stored !== 'undefined') ? JSON.parse(stored) : [
        { id: 1, name: "Healthcare", subtitle: "BIOTECH & MEDICAL", families: ["Nursing", "Surgery", "Admin"], isOpen: true },
        { id: 2, name: "Technology", subtitle: "CORE TECH", families: ["Engineering", "Product", "Design"], isOpen: true },
        { id: 3, name: "Finance", subtitle: "FINANCE", families: ["Banking", "Investment"], isOpen: false },
        { id: 4, name: "Retail", subtitle: "COMMERCE", families: ["Logistics", "Customer Service"], isOpen: false },
        { id: 5, name: "Manufacturing", subtitle: "PRODUCTION", families: ["Supply Chain", "Quality Control"], isOpen: false }
      ];
    } catch (e) {
      console.error("[JDContext] Failed to load departments:", e);
      return [];
    }
  });

  const [workflows, setWorkflows] = useState(() => {
    try {
      const stored = localStorage.getItem("jdforge_workflows");
      if (stored && stored !== 'undefined') return JSON.parse(stored);
    } catch (e) { console.error("[JDContext] Failed to load workflows:", e); }
    return [
      {
        id: "wf_1",
        name: "Standard JD Review",
        department: "Technology",
        active: true,
        steps: [
          { order: 1, name: "Initial Review", reviewerEmail: "hr.manager@company.com", role: "HR", sla: 2 },
          { order: 2, name: "Hiring Manager Approval", reviewerEmail: "tech.director@company.com", role: "Manager", sla: 3 }
        ]
      },
      {
        id: "wf_2",
        name: "Executive Leadership Hire",
        department: "Healthcare",
        active: true,
        steps: [
          { order: 1, name: "Peer Review", reviewerEmail: "lead@hospital.org", role: "Manager", sla: 2 },
          { order: 2, name: "Board Review", reviewerEmail: "board@hospital.org", role: "Admin", sla: 5 },
          { order: 3, name: "Final Signoff", reviewerEmail: "ceo@hospital.org", role: "Admin", sla: 2 }
        ]
      }
    ];
  });

  const [teamMembers, setTeamMembers] = useState(() => {
    try {
      const stored = localStorage.getItem("jdforge_team_members");
      if (stored && stored !== 'undefined') {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { console.error("[JDContext] Failed to load team members:", e); }
    return [
      { id: 1, name: "Admin User", email: "admin@talentforge.com", role: "Admin", status: "Active", avatar: "A" },
      { id: 2, name: "HR Lead", email: "hr@talentforge.com", role: "HR", status: "Active", avatar: "H" },
      { id: 3, name: "Marcus Thorne", email: "manager1@talentforge.com", role: "Manager", status: "Active", avatar: "MT" },
      { id: 4, name: "Elena Rodriguez", email: "manager2@talentforge.com", role: "Manager", status: "Active", avatar: "ER" },
      { id: 5, name: "Legal Counsel", email: "compliance@talentforge.com", role: "Manager", status: "Active", avatar: "LC" },
    ];
  });

  // Auth State (Moved up)
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem("jdforge_session") === "1");

  const normalizeJD = (jd) => {
    if (!jd) return jd;

    // Length-aware fallback for history
    const getBestHistory = (j) => {
      // Prioritize the new unified comments_trail
      if (Array.isArray(j.comments_trail) && j.comments_trail.length > 0) {
        return j.comments_trail.map(c => ({
          status: c.decision || c.status || 'updated',
          timestamp: c.timestamp,
          updatedBy: c.full_name || c.userName || (c.role === 'HR' ? 'HR Manager' : 'Manager'),
          updatedByEmail: c.email || c.user_email || c.reviewerEmail,
          comment: c.comment,
          role: c.role
        }));
      }
      if (Array.isArray(j.history) && j.history.length > 0) return j.history;
      if (Array.isArray(j.audit_history) && j.audit_history.length > 0) return j.audit_history;
      if (Array.isArray(j.audit_log) && j.audit_log.length > 0) return j.audit_log;
      if (Array.isArray(j.workflow_steps) && j.workflow_steps.length > 0) return j.workflow_steps;
      return [];
    };

    const rawHistory = getBestHistory(jd);

    // Synthesize history from legacy fields if still empty
    if (rawHistory.length === 0) {
      if (jd.submittedAt) {
        rawHistory.push({
          status: 'submitted',
          timestamp: jd.submittedAt,
          updatedBy: jd.createdBy || jd.user?.full_name || "HR Manager"
        });
      }
      if (jd.reviewedAt) {
        rawHistory.push({
          status: jd.status || 'approved',
          timestamp: jd.reviewedAt,
          updatedBy: jd.reviewedBy || "Manager",
          comment: jd.reviewerFeedback || ""
        });
      }
    }

    // Helper to strip procedural tags from messages
    const cleanMessage = (msg) => {
      if (!msg || typeof msg !== 'string') return msg;
      return msg
        .replace(/Review requested\s*/gi, '')
        .replace(/\[APPROVED\]\s*/gi, '')
        .replace(/\[REJECTED\]\s*/gi, '')
        .replace(/\[REVISION REQUESTED\]\s*/gi, '')
        .replace(/\n\s*\n/g, '\n') // Remove double newlines
        .trim();
    };

    // Pre-normalize history entries with proper timestamps and cleaned comments
    const history = rawHistory.map(h => {
      const ts = h.timestamp || h.created_at || h.updated_at;
      return {
        ...h,
        timestamp: ts,
        comment: cleanMessage(h.comment || h.message || "")
      };
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Length-aware fallback for comments
    const getBestComments = (j) => {
      const existing = (Array.isArray(j.comments) && j.comments.length > 0) ? j.comments :
        (Array.isArray(j.feedback) && j.feedback.length > 0) ? j.feedback :
          (Array.isArray(j.discussions) && j.discussions.length > 0) ? j.discussions : [];

      // Merge unique comments from history into the discussion thread
      const historyComments = history
        .filter(h => h.comment && h.comment.trim())
        .map(h => ({
          userName: h.updatedBy || h.user || h.userName || "Manager",
          user: h.updatedBy || h.user || h.userName || "Manager",
          message: h.comment,
          timestamp: h.timestamp,
          role: h.role || (h.status === 'submitted' ? 'HR' : 'Manager')
        }));

      // Combine and de-duplicate by cleaned message content
      const all = [...existing, ...historyComments];
      const seenMessages = new Set();

      return all
        .map(c => ({
          ...c,
          message: cleanMessage(c.message || c.comment || "")
        }))
        .filter(c => c.message && c.message.trim())
        .filter(c => {
          // De-duplicate based on message content to remove the "Invalid Date" copies
          if (seenMessages.has(c.message)) return false;
          seenMessages.add(c.message);
          return true;
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    };

    const createdAt = jd.createdAt || jd.created_at || (history.length > 0 ? history[0].timestamp : new Date().toISOString());
    const updatedAt = jd.updatedAt || jd.updated_at || (history.length > 0 ? history[history.length - 1].timestamp : createdAt);

    // Find a human-readable name for "Created By"
    const authorName = jd.author_name || jd.userName || jd.user?.full_name ||
      (history.length > 0 ? history[0].updatedBy : null) ||
      "System";

    const rawContent = (jd.content && typeof jd.content === "object" && !Array.isArray(jd.content))
      ? jd.content
      : (jd.content || {});
    const { content, sections_metadata: mergedMeta } = sanitizeStableContent(
      rawContent,
      jd.sections_metadata || rawContent.sections_metadata || {}
    );
    const genMode = jd.generation_mode || content.generation_mode || content.metadata?.generation_mode || jd.generationMode || (jd.template_id || content.template_id ? "template" : "ai");
    const sections_order = content.sections_order || jd.sections_order || [];

    // Spread content after jd so stable section_* keys and sections_order are not clobbered by stale root fields
    return {
      ...jd,
      ...content,
      id: jd.id || jd.jd_id,
      content,
      sections_order,
      sections_metadata: mergedMeta,
      generation_mode: genMode,
      createdAt,
      updatedAt,
      authorName,
      comments: getBestComments(jd),
      history: history,
      weight_view_responsibilities_view: jd.weight_view_responsibilities_view || content.weight_view_responsibilities_view || "unlocked",
      weight_view_corecompetencies_view: jd.weight_view_corecompetencies_view || content.weight_view_corecompetencies_view || "unlocked",
      weight_view_functionalcompetencies_view: jd.weight_view_functionalcompetencies_view || content.weight_view_functionalcompetencies_view || "unlocked",
      weight_view_qualifications_required_view: jd.weight_view_qualifications_required_view || content.weight_view_qualifications_required_view || "unlocked",
      weight_view_qualifications_preferred_view: jd.weight_view_qualifications_preferred_view || content.weight_view_qualifications_preferred_view || "unlocked",
      summary_view: jd.summary_view || content.summary_view || "unlocked",
      responsibilities_view: jd.responsibilities_view || content.responsibilities_view || "unlocked",
      corecompetencies_view: jd.corecompetencies_view || content.corecompetencies_view || "unlocked",
      functionalcompetencies_view: jd.functionalcompetencies_view || content.functionalcompetencies_view || "unlocked",
      qualifications_view: jd.qualifications_view || content.qualifications_view || "unlocked"
    };
  };

  const [user, setUser] = useState(null);

  const [allJDs, setAllJDs] = useState([]);

  const [receivedJDs, setReceivedJDs] = useState([]);
  const [isRefreshingReceived, setIsRefreshingReceived] = useState(false);
  const [isRefreshingWorkflows, setIsRefreshingWorkflows] = useState(false);
  const [isRefreshingMembers, setIsRefreshingMembers] = useState(false);
  const [isRefreshingCompetencies, setIsRefreshingCompetencies] = useState(false);

  // Derived state for the current user's visible JDs
  const myJDs = useMemo(() => {
    if (!user) return [];
    const role = (user.role || "").toLowerCase();
    const uid = user.userId || user.id || user.email;

    // 1. Admins see everything
    if (role.includes('admin')) return allJDs;

    // 2. Everyone sees their own creations (all statuses including drafts)
    const ownJDs = allJDs.filter(jd =>
      jd.createdBy === uid ||
      jd.createdBy === user.userId ||
      jd.createdBy === user.id ||
      jd.createdBy === user.email
    );

    // 3. Managers see JDs assigned to THEM, JDs they created, or JDs they have in their history
    if (role.includes('manager')) {
      const jdMap = new Map();

      // Add creations (allJDs filtered by creator)
      ownJDs.forEach(j => jdMap.set(j.id, j));

      // Add assigned (receivedJDs)
      receivedJDs.forEach(j => jdMap.set(j.id, j));

      return Array.from(jdMap.values());
    }

    // 4. Default for HR/Others: Just their own JDs
    return ownJDs;
  }, [allJDs, receivedJDs, user]);

  // Competencies State
  const [coreCompetenciesDB, setCoreCompetenciesDB] = useState([]);
  const [functionalCompetenciesDB, setFunctionalCompetenciesDB] = useState([]);

  // const login = (token, userData) => {
  //   setIsAuthenticated(true);
  //   localStorage.setItem("jdforge_auth", "true");
  //   if (token) {
  //     localStorage.setItem("jdforge_token", token);
  //   }
  //   if (userData) {
  //     const enriched = enrichUserProfile(userData);
  //     setUser(enriched);
  //     localStorage.setItem("jdforge_user", JSON.stringify(enriched));

  //     // Track session start for 12h limit
  //     if (!localStorage.getItem("jdforge_session_start")) {
  //       // If the backend provides session duration, use it to calculate true start time
  //       const durationSec = userData.previous_session_logged_out?.session_duration_sec || 0;
  //       const startTime = new Date(Date.now() - (durationSec * 1000));
  //       localStorage.setItem("jdforge_session_start", startTime.toISOString());
  //     }

  //     if (enriched.country) {
  //       setDetectedRegion(enriched.region || enriched.country);
  //     }
  //   }
  // };


  const login = (token, userData) => {
    setIsAuthenticated(true);
    if (token) {
      setAccessToken(token);
    }
    sessionStorage.setItem("jdforge_session", "1");
    sessionStorage.setItem("jdforge_session_start", new Date().toISOString());
    if (userData) {
      const enriched = enrichUserProfile(userData);
      setUser(enriched);
      if (enriched.country) {
        setDetectedRegion(enriched.region || enriched.country);
      }
    }
  };
  const logout = async () => {
    // Clear all timers
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    if (sessionLimitTimeoutRef.current) {
      clearTimeout(sessionLimitTimeoutRef.current);
      sessionLimitTimeoutRef.current = null;
    }

    // Call backend logout (optional but recommended)
    try {
      await authService.logout();
    } catch (err) {
      console.error("[JDContext] Backend logout failed:", err);
    }

    // Reset state and clear storage
    setIsAuthenticated(false);
    setUser(null);
    clearAccessToken();
    sessionStorage.removeItem("jdforge_session");
    sessionStorage.removeItem("jdforge_session_start");
  };

  // Theme State
  const [theme, setTheme] = useState("light");

  const toggleTheme = () => {
    // Theme switching is disabled as per user request
    console.log("Theme switching is disabled.");
  };

  useEffect(() => {
    // Ensure 'light' class is on document element and 'dark' is removed
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, []);

  // Fetch user profile if authenticated - ensure we get latest even if stored in localStorage
  // useEffect(() => {
  //   if (isAuthenticated) {
  //     const fetchProfile = async () => {
  //       try {
  //         const profile = await authService.getMe();
  //         if (profile) {
  //           const enriched = enrichUserProfile(profile);
  //           // Only update if data is actually different or we had "User" fallback
  //           if (user?.full_name === "User" || !user || user.full_name !== enriched.full_name || user.country !== enriched.country) {
  //             console.log("[JDContext] Updating user profile context:", enriched.full_name);
  //             setUser(enriched);
  //             localStorage.setItem("jdforge_user", JSON.stringify(enriched));
  //           }
  //         }
  //       } catch (error) {
  //         console.error("Failed to fetch user profile:", error);
  //       }
  //     };
  //     fetchProfile();
  //   }
  // }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchProfile = async () => {
      try {
        const profile = await authService.getMe();
        if (profile) {
          setUser(enrichUserProfile(profile));
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        logout();
      }
    };
    fetchProfile();
  }, [isAuthenticated]);

  const [isLoadingJDs, setIsLoadingJDs] = useState(false);

  const refreshMyJDs = async () => {
    if (!isAuthenticated) return;
    setIsLoadingJDs(true);
    try {
      const jds = await jdService.getMyJDs();
      if (jds) {
        const normalized = Array.isArray(jds) ? jds.map(normalizeJD) : [];
        setAllJDs(normalized);
      }
    } catch (error) {
      console.error("Failed to refresh JDs:", error);
    } finally {
      setIsLoadingJDs(false);
    }
  };

  const refreshWorkflows = async () => {
    if (!isAuthenticated) return;
    setIsRefreshingWorkflows(true);
    try {
      const data = await workflowService.listWorkflows();
      // Extract from various possible wrappers: {data: {workflows: []}}, {workflows: []}, {results: []}, or raw array
      const workflowList = Array.isArray(data) ? data :
        (data?.data?.workflows || data?.workflows || data?.data || data?.results || data?.items || []);

      if (Array.isArray(workflowList)) {
        setWorkflows(workflowList.map(wf => ({
          ...wf,
          id: wf.id || wf.workflow_id || wf._id
        })));
      } else {
        console.warn("[JDContext] Workflows API did not return an array:", data);
      }
    } catch (error) {
      console.error("[JDContext] Failed to refresh workflows:", error);
    } finally {
      setIsRefreshingWorkflows(false);
    }
  };

  const refreshReceivedJDs = async () => {
    if (!isAuthenticated) return;
    setIsRefreshingReceived(true);
    try {
      const data = await workflowService.getReceivedJDs();
      if (data) {
        // Handle varied backend response structures
        const rawList = Array.isArray(data) ? data : (data.received || data.results || data.items || []);

        // Normalize fields to match frontend expectations
        const normalizedList = rawList.map(item => {
          const normalized = normalizeJD(item);
          // Map new 'in_review' status to internal 'pending' for backward compatibility in some components
          // or just ensure 'in_review' is recognized as an active review state.
          const currentStatus = (normalized.status || "").toLowerCase();
          const shouldBePending = ['waiting_for_approval', 'in_review', 'active', 'submitted'].includes(currentStatus);

          return {
            ...normalized,
            status: shouldBePending ? 'pending' : normalized.status
          };
        });

        setReceivedJDs(normalizedList);
      } else {
        setReceivedJDs([]);
      }
    } catch (error) {
      console.error("Failed to refresh received JDs:", error);
    } finally {
      setIsRefreshingReceived(false);
    }
  };

  const refreshCompetencies = async () => {
    if (!isAuthenticated) return;
    setIsRefreshingCompetencies(true);
    try {
      const data = await organizationService.getCompetencies();
      // Handle various response formats
      const list = Array.isArray(data) ? data : (data?.data || data?.results || []);

      // Map to strings as expected by the existing UI components
      const core = list
        .filter(c => c.category_name?.toLowerCase().includes("core"))
        .map(c => c.competency_name || c.competencyName);

      const functional = list
        .filter(c => c.category_name?.toLowerCase().includes("functional"))
        .map(c => c.competency_name || c.competencyName);

      setCoreCompetenciesDB(core);
      setFunctionalCompetenciesDB(functional);
    } catch (error) {
      console.error("[JDContext] Failed to refresh competencies:", error);
    } finally {
      setIsRefreshingCompetencies(false);
    }
  };

  const refreshMembers = async () => {
    if (!isAuthenticated) return;
    setIsRefreshingMembers(true);
    try {
      const resp = await workflowService.listWorkflowMembers();
      // Handle extremely nested extraction (e.g. resp.data.results.members or resp.members)
      const data = resp?.data || resp;
      const members = Array.isArray(data) ? data :
        (data?.members || data?.results || data?.items || data?.data?.members || []);

      if (Array.isArray(members)) {
        setTeamMembers(members);
      } else {
        console.warn("[JDContext] Members API did not return an array:", resp);
      }
    } catch (error) {
      console.error("[JDContext] Failed to refresh members:", error);
    } finally {
      setIsRefreshingMembers(false);
    }
  };

  const scheduleTokenRefresh = () => {
    if (!isAuthenticated) return;

    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    // Refresh every 2 hours (minus 2 minutes buffer to be safe)
    const REFRESH_INTERVAL_MS = (2 * 60 * 60 * 1000) - (2 * 60 * 1000);

    // 1. Check total session duration (12h limit)
    const sessionStart = sessionStorage.getItem("jdforge_session_start");
    if (sessionStart) {
      const elapsed = Date.now() - new Date(sessionStart).getTime();
      const remainingToLimit = MAX_SESSION_DURATION_MS - elapsed;

      if (elapsed >= MAX_SESSION_DURATION_MS) {
        console.log("[JDContext] 12-hour session limit reached. Logging out.");
        logout();
        return;
      }

      // If the next refresh would happen AFTER the 12h limit, don't schedule it
      if (REFRESH_INTERVAL_MS > remainingToLimit) {
        console.log(`[JDContext] Next refresh would exceed 12h limit. Stop scheduling.`);
        return;
      }
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        console.log("[JDContext] Executing 2-hour token refresh...");
        await authService.refreshToken();
        scheduleTokenRefresh(); // Schedule next one
      } catch (err) {
        console.error("[JDContext] Auto-refresh failed:", err);
        // If refresh fails, we'll likely hit a 401 on the next request which will trigger logout
      }
    }, REFRESH_INTERVAL_MS);
  };

  const startSessionLimitTimer = () => {
    if (sessionLimitTimeoutRef.current) clearTimeout(sessionLimitTimeoutRef.current);

    let sessionStart = sessionStorage.getItem("jdforge_session_start");
    if (!sessionStart && isAuthenticated) {
      sessionStart = new Date().toISOString();
      sessionStorage.setItem("jdforge_session_start", sessionStart);
    }

    if (sessionStart) {
      const elapsed = Date.now() - new Date(sessionStart).getTime();
      const remaining = MAX_SESSION_DURATION_MS - elapsed;

      if (remaining <= 0) {
        logout();
      } else {
        console.log(`[JDContext] Session will expire in ${((remaining / 3600000)).toFixed(2)} hours (12h limit).`);
        sessionLimitTimeoutRef.current = setTimeout(() => {
          console.log("[JDContext] Hard session limit reached. Logging out.");
          logout();
        }, remaining);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      startSessionLimitTimer();
      scheduleTokenRefresh();

      // Avoid calling admin/hr/manager APIs for end users/candidates
      const role = user?.role?.toLowerCase() || "";
      const isEndUser = role.includes("enduser") || role.includes("learner") || role === "user";

      if (!isEndUser) {
        refreshMyJDs();
        refreshWorkflows();
        refreshReceivedJDs();
        refreshMembers();
        refreshCompetencies();
      }
    }
  }, [isAuthenticated, user]);

  // Competency Actions
  const addCoreCompetencyDB = (comp) => {
    if (!coreCompetenciesDB.includes(comp)) {
      setCoreCompetenciesDB([...coreCompetenciesDB, comp]);
    }
  };

  const deleteCoreCompetencyDB = (comp) => {
    setCoreCompetenciesDB(coreCompetenciesDB.filter(c => c !== comp));
  };

  const addFunctionalCompetencyDB = (comp) => {
    if (!functionalCompetenciesDB.includes(comp)) {
      setFunctionalCompetenciesDB([...functionalCompetenciesDB, comp]);
    }
  };

  const deleteFunctionalCompetencyDB = (comp) => {
    setFunctionalCompetenciesDB(functionalCompetenciesDB.filter(c => c !== comp));
  };



  const addJD = async (jdContent) => {
    if (!user) return;
    const uid = user.userId || user.id || user.email;
    // If jdContent already has a well-formed JD object (from handleSave),
    // use it directly so we don't double-wrap or lose the ID.
    const newJD = {
      id: jdContent.id || `jd_${Date.now()}`,
      title: jdContent.title || "Untitled JD",
      description: jdContent.description || "",
      // Keep 'content' if provided, otherwise store the fields at top level
      content: jdContent.content || jdContent,
      createdBy: jdContent.createdBy || uid,
      creator_id: jdContent.creator_id || uid,
      author: jdContent.author || user.full_name || user.name || "HR User",
      department: jdContent.department || "",
      jobId: jdContent.jobId || "",
      companyName: jdContent.companyName || "",
      location: jdContent.location || "",
      status: jdContent.status || 'draft',
      history: jdContent.history || [{
        status: 'draft',
        timestamp: new Date().toISOString(),
        updatedBy: user.full_name || user.name || user.username || "HR User"
      }],
      comments: jdContent.comments || [],
      createdAt: jdContent.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    console.log(`[JDContext] Attempting to add/update JD: "${newJD.title}" (ID: ${newJD.id})`);

    setAllJDs((prev) => {
      // 1. Precise ID match (Update existing)
      const existsIdIdx = prev.findIndex(j => String(j.id) === String(newJD.id));
      if (existsIdIdx !== -1) {
        console.log(`[JDContext] Exact ID match found for "${newJD.id}". Updating existing entry.`);
        const updated = [...prev];
        updated[existsIdIdx] = { ...updated[existsIdIdx], ...newJD };
        return updated;
      }

      // 2. Near-duplicate check (Same title/dept created within 3 seconds)
      // This catches race conditions where two local generations (with different timestamps/IDs) happen in parallel
      const now = new Date(newJD.createdAt).getTime();
      const nearDuplicate = prev.find(j =>
        j.title === newJD.title &&
        (j.department === newJD.department || (!j.department && !newJD.department)) &&
        Math.abs(new Date(j.createdAt).getTime() - now) < 5000 // Increased to 5s for slower network environments
      );

      if (nearDuplicate) {
        console.warn(`[JDContext] Near-duplicate detected for "${newJD.title}" (${newJD.id}). Ignoring redundant entry.`);
        return prev;
      }

      console.log(`[JDContext] Adding NEW JD entry: "${newJD.title}" (${newJD.id})`);
      return [...prev, newJD];
    });
  };

  const updateJD = async (id, updatedContent) => {
    if (!user) return;
    const uid = user.userId || user.id || user.email;
    setAllJDs((prev) =>
      prev.map((jd) => {
        if (String(jd.id) === String(id)) {
          const userRole = (user.role || "").toLowerCase();
          const jdStatus = (jd.status || "").toLowerCase();

          const isAdmin = userRole.includes('admin');
          const isHR = userRole.includes('hr');
          const isManager = userRole.includes('manager');
          const isCreator = jd.createdBy === uid || jd.creator_id === uid;

          // User has UNION of permissions from all their roles
          const canEdit = isAdmin || isCreator ||
            (isHR && ['draft', 'rejected', 'declined', 'finalized', 'final'].includes(jdStatus)) ||
            (isManager && ['draft', 'submitted', 'pending', 'in_review', 'active', 'approved', 'rejected', 'declined'].includes(jdStatus));

          if (!canEdit) {
            console.warn(`Unauthorized to edit ${jdStatus} JD as ${userRole}`);
            return jd;
          }

          return {
            ...jd,
            ...updatedContent,
            updatedAt: new Date().toISOString()
          };
        }
        return jd;
      })
    );
  };

  const deleteJD = async (id) => {
    try {
      await jdService.deleteJD(id);
      setAllJDs((prev) => prev.filter((jd) => String(jd.id) !== String(id)));
    } catch (error) {
      console.error("Failed to delete JD from backend:", error);
      // Still update local state to avoid UI lag, but maybe show warning?
      setAllJDs((prev) => prev.filter((jd) => String(jd.id) !== String(id)));
    }
  };

  const submitJD = (id) => {
    if (!user) return;
    setAllJDs(prev => prev.map(jd => {
      const currentStatus = (jd.status || '').toLowerCase();
      if (String(jd.id) === String(id) && (currentStatus === 'finalized' || currentStatus === 'rejected' || currentStatus === 'declined')) {
        return {
          ...jd,
          status: 'submitted',
          updatedAt: new Date().toISOString(),
          history: [...jd.history, {
            status: 'submitted',
            timestamp: new Date().toISOString(),
            updatedBy: user.full_name || user.name || "HR User"
          }]
        };
      }
      return jd;
    }));
  };

  const submitJDWithWorkflow = async (jdId, workflowId, comment = "") => {
    if (!user) return;
    try {
      const result = await workflowService.triggerWorkflow(jdId, workflowId, comment);
      if (result) {
        await refreshMyJDs();
        return result;
      }
    } catch (error) {
      console.error("Failed to trigger workflow:", error);
      throw error;
    }
  };

  const bulkSubmitJDWithWorkflow = async (jdIds, workflowId, comment = "") => {
    if (!user) return;
    try {
      const result = await workflowService.bulkTriggerWorkflow(jdIds, workflowId, comment);
      if (result) {
        await refreshMyJDs();
        return result;
      }
    } catch (error) {
      console.error("Failed to bulk trigger workflow:", error);
      throw error;
    }
  };

  const createJDWorkflow = async (workflowData) => {
    if (!user) return;
    try {
      const result = await workflowService.createWorkflow(workflowData);
      if (result) {
        await refreshWorkflows();
        return result;
      }
    } catch (error) {
      console.error("Failed to create workflow:", error);
      throw error;
    }
  };

  const deleteJDWorkflow = async (id) => {
    if (!user) return;
    try {
      await workflowService.deleteWorkflow(id);
      await refreshWorkflows();
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      throw error;
    }
  };

  const approveJD = async (id, comment = "") => {
    if (!user) return;
    try {
      const result = await workflowService.decideOnWorkflow(id, "approved", comment);
      if (result) {
        await refreshReceivedJDs();
        await refreshMyJDs();
        return result;
      }
    } catch (error) {
      console.error("Failed to approve JD:", error);
      throw error;
    }
  };

  const reviewJD = async (id, decision, comment = "") => {
    if (!user) return;
    try {
      const result = await workflowService.decideOnWorkflow(id, decision, comment);
      if (result) {
        await refreshReceivedJDs();
        await refreshMyJDs();
        return result;
      }
    } catch (error) {
      console.error("Failed to review JD:", error);
      throw error;
    }
  };

  const addComment = (id, commentText) => {
    if (!user) return;
    setAllJDs(prev => prev.map(jd => {
      if (String(jd.id) === String(id)) {
        return {
          ...jd,
          comments: [...jd.comments, {
            userName: user.email,
            role: user.role || "User",
            message: commentText,
            timestamp: new Date().toISOString()
          }]
        };
      }
      return jd;
    }));
  };

  const queueJDForPush = (input) => {
    setPushQueue((prev) => {
      // Normalize to array
      const newItems = Array.isArray(input) ? input : [input];

      const filteredNewItems = newItems.filter(newItem => {
        if (!newItem || !newItem.id) return false;
        const exists = prev.some(existing => existing.id === newItem.id);
        return !exists;
      });

      if (filteredNewItems.length === 0) return prev;

      return [...prev, ...filteredNewItems];
    });
  };

  const getWorkflowStatus = useCallback(async (jdId) => {
    if (!user) return null;
    try {
      return await workflowService.getWorkflowRunStatus(jdId);
    } catch (error) {
      console.error("Failed to get workflow status:", error);
      return null;
    }
  }, [user]);

  const getJDHistory = useCallback(async (jdId) => {
    try {
      return await workflowService.getJDHistory(jdId);
    } catch (error) {
      console.error("Failed to get JD history:", error);
      return null;
    }
  }, []);

  const pushToCSOD = async (ids) => {
    const pushed = pushQueue.filter((jd) =>
      ids.map(String).includes(String(jd.id))
    );

    try {
      await Promise.all(ids.map(id => jdService.pushJDToCSODStatus(id)));
    } catch (err) {
      console.error("Failed to update push status on backend:", err);
    }

    const historyEntries = pushed.map((jd) => ({
      ...jd,
      pushedAt: new Date().toISOString()
    }));

    // Update the main JDs state to reflect the 'pushed' status
    setAllJDs((prev) => prev.map(jd => {
      if (ids.map(String).includes(String(jd.id))) {
        return {
          ...jd,
          status: 'pushed',
          updatedAt: new Date().toISOString(),
          history: [
            ...(jd.history || []),
            {
              status: 'pushed',
              timestamp: new Date().toISOString(),
              updatedBy: user?.full_name || user?.name || "Admin User"
            }
          ]
        };
      }
      return jd;
    }));

    setPushHistory((prev) => [
      ...historyEntries,
      ...prev
    ]);

    setPushQueue((prev) =>
      prev.filter((jd) => !ids.includes(jd.id))
    );
  };


  const [detectedRegion, setDetectedRegion] = useState("IN"); // Default fallback
  const [locationData, setLocationData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchLocation = async () => {
      try {
        // Use the local Vite proxy to bypass CORS
        const response = await fetch("/geo-api/");

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(`Location fetch failed with status: ${response.status}`);
        }

        const data = await response.clone().json();

        // Normalize data from either ipapi.co (snake_case) or freeipapi (camelCase)
        const countryCode = (data.country_code && data.country_code !== "string") ? data.country_code :
          (data.countryCode && data.countryCode !== "string") ? data.countryCode : null;
        const city = (data.city && data.city !== "string") ? data.city :
          (data.cityName && data.cityName !== "string") ? data.cityName : "Detected";
        const countryName = (data.country_name && data.country_name !== "string") ? data.country_name :
          (data.countryName && data.countryName !== "string") ? data.countryName : "India";

        if (countryCode) {
          let region = countryCode;
          if (region === "GB") region = "UK"; // Map UK
          setDetectedRegion(region);
          setLocationData({
            city: city,
            country_name: countryName,
            country_code: region
          });
          console.log("Detected user region:", region, city);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to detect location:", error);
        // Fallback to timezone-based detection
        const fallback = inferCountryFromTimeZone();
        setDetectedRegion(fallback.code);
        setLocationData({
          city: "Detected",
          country_name: fallback.name,
          country_code: fallback.code
        });
        console.log("[JDContext] Fallback region detected via timezone:", fallback.code);
      }
    };
    fetchLocation();
    return () => { isMounted = false; };
  }, []);

  return (
    <JDContext.Provider
      value={{
        allJDs,
        myJDs,
        addJD,
        updateJD,
        deleteJD,
        submitJD,
        reviewJD,
        addComment,
        pushQueue,
        pushHistory,
        queueJDForPush,
        pushToCSOD,
        coreCompetenciesDB,
        functionalCompetenciesDB,
        addCoreCompetencyDB,
        deleteCoreCompetencyDB,
        addFunctionalCompetencyDB,
        deleteFunctionalCompetencyDB,
        isLoadingJDs,
        refreshMyJDs,
        isAuthenticated,
        user,
        login,
        logout,
        detectedRegion,
        locationData,
        theme,
        toggleTheme,
        departments,
        setDepartments,
        workflows,
        setWorkflows,
        teamMembers,
        setTeamMembers,
        submitJDWithWorkflow,
        bulkSubmitJDWithWorkflow,
        createJDWorkflow,
        deleteJDWorkflow,
        approveJD,

        receivedJDs,
        refreshWorkflows,
        refreshReceivedJDs,
        refreshMembers,
        refreshCompetencies,
        getWorkflowStatus,
        getJDHistory,
        isRefreshingReceived,
        isRefreshingWorkflows,
        isRefreshingMembers,
        normalizeJD
      }}
    >
      {children}
    </JDContext.Provider>
  );

};