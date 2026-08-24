import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { Toaster } from "react-hot-toast";
import { JDContext } from "./context/JDContext";
import PageLayout from "./layout/PageLayout";

import GenerateJD from "./pages/Admin/GenerateJD";
import AdminDashboard from "./pages/Admin/Dashboard";
import ManagerDashboard from "./pages/Manager/Dashboard";
import AdminMyJDs from "./pages/Admin/MyJDs";
import ManagerMyJDs from "./pages/Manager/MyJDs";
import Templates from "./pages/Admin/Templates";
import PushToCSOD from "./pages/Admin/PushToCSOD";
import Competencies from "./pages/Admin/Competencies";
import Login from "./pages/Auth/SignIn";
import JDForgeAuth from "./pages/Auth/SignUp";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import AdminSettings from "./pages/Admin/Settings";
import Analytics from "./pages/Admin/Analytics";
import HRDashboard from "./pages/HR/Dashboard";
import JDDetail from "./pages/HR/JDDetail";
import HRMyJDs from "./pages/HR/MyJDs";
import ReviewCollaborate from "./pages/Manager/ReviewCollaborate";
import RoleProtectedRoute from "./components/common/RoleProtectedRoute";
import Home from "./pages/Home";
import AssignedJDs from "./pages/Admin/AssignedJDs";
import ViewAssignedJD from "./pages/Admin/ViewAssignedJD";
import CSODJDView from "./pages/common/CSODJDView";
import JobOpenings from "./pages/common/JobOpenings";
import PublishedJDDetail from "./pages/common/PublishedJDDetail";
import ManualJDEditor from "./pages/common/ManualJDEditor";

// Super Admin Pages
import SuperAdminDashboard from "./pages/SuperAdmin/Dashboard";
import SuperAdminOrganizations from "./pages/SuperAdmin/Organizations";
import SuperAdminAnalytics from "./pages/SuperAdmin/Analytics";
import SuperAdminBroadcasts from "./pages/SuperAdmin/Broadcasts";
import SuperAdminPlatformVoices from "./pages/SuperAdmin/PlatformVoices";
import SuperAdminAgent from "./pages/SuperAdmin/SuperAdminAgent";
import SuperAdminChatbotModal from "./components/superadmin/SuperAdminChatbotModal";

const HomeWrapper = () => {
  const { isAuthenticated } = useContext(JDContext);
  return isAuthenticated ? <RoleRedirect /> : <Home />;
};

// End User Pages
import EndUserDashboard from "./pages/EndUser/Dashboard";
import MyPerformance from "./pages/EndUser/MyPerformance";
import InboxTasks from "./pages/EndUser/InboxTasks";

import JDReview from "./pages/EndUser/JDReview";
import TermsAndConditionsPage from "./pages/common/TermsAndConditionsPage";
import { getDashboardPathForRole } from "./utils/roles";
import NotificationsPage from "./pages/common/NotificationsPage";


const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(JDContext);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const RoleRedirect = () => {
  const { user } = useContext(JDContext);
  if (!user) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return <Navigate to={getDashboardPathForRole(user.role)} replace />;
};


const ProtectedAdminLayout = () => {
  return (
    <RoleProtectedRoute allowedRoles={["admin"]}>
      <PageLayout>
        <Outlet />
      </PageLayout>
    </RoleProtectedRoute>
  );
};

const ProtectedSuperAdminLayout = () => {
  return (
    <RoleProtectedRoute allowedRoles={["superadmin", "super-admin", "super_admin"]}>
      <PageLayout>
        <Outlet />
        <SuperAdminChatbotModal />
      </PageLayout>
    </RoleProtectedRoute>
  );
};

const ProtectedHRLayout = () => {
  return (
    <RoleProtectedRoute allowedRoles={["hr"]}>
      <PageLayout>
        <Outlet />
      </PageLayout>
    </RoleProtectedRoute>
  );
};

const ProtectedManagerLayout = () => {
  return (
    <RoleProtectedRoute allowedRoles={["manager"]}>
      <PageLayout>
        <Outlet />
      </PageLayout>
    </RoleProtectedRoute>
  );
};

const ProtectedEndUserLayout = () => {
  return (
    <RoleProtectedRoute allowedRoles={["enduser", "user"]}>
      <PageLayout>
        <Outlet />
      </PageLayout>
    </RoleProtectedRoute>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<HomeWrapper />} />

        {/* Legacy / broken path used by older navbar search — redirect to role dashboard */}
        <Route path="/dashboard" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />

        {/* Super Admin Routes */}
        <Route element={<ProtectedSuperAdminLayout />}>
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/agent" element={<SuperAdminAgent />} />
          <Route path="/superadmin/organizations" element={<SuperAdminOrganizations />} />
          <Route path="/superadmin/analytics" element={<SuperAdminAnalytics />} />
          <Route path="/superadmin/platform-voices" element={<SuperAdminPlatformVoices />} />
          <Route path="/superadmin/broadcasts" element={<SuperAdminBroadcasts />} />
          {/* Legacy hyphenated paths */}
          <Route path="/super-admin/dashboard" element={<Navigate to="/superadmin/dashboard" replace />} />
          <Route path="/super-admin/agent" element={<Navigate to="/superadmin/agent" replace />} />
          <Route path="/super-admin/organizations" element={<Navigate to="/superadmin/organizations" replace />} />
          <Route path="/super-admin/analytics" element={<Navigate to="/superadmin/analytics" replace />} />
          <Route path="/super-admin/platform-voices" element={<Navigate to="/superadmin/platform-voices" replace />} />
          <Route path="/super-admin/broadcasts" element={<Navigate to="/superadmin/broadcasts" replace />} />
        </Route>

        {/* Admin Routes with persistent Sidebar */}
        <Route element={<ProtectedAdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/generate" element={<GenerateJD />} />
          <Route path="/admin/generate/:id" element={<GenerateJD />} />
          <Route path="/admin/generate/manual/:id" element={<ManualJDEditor />} />
          <Route path="/admin/jd/:id" element={<GenerateJD />} />
          <Route path="/admin/templates" element={<Templates />} />
          <Route path="/admin/my-jds" element={<AdminMyJDs />} />
          <Route path="/admin/assigned-jds" element={<AssignedJDs />} />
          <Route path="/admin/assigned/view/:id" element={<ViewAssignedJD />} />
          <Route path="/admin/view/:id" element={<JDDetail />} />
           <Route path="/admin/push-csod" element={<PushToCSOD />} />
          <Route path="/admin/csod-jd/:ouid" element={<CSODJDView />} />
          <Route path="/admin/competencies" element={<Competencies />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/job-openings" element={<JobOpenings />} />
          <Route path="/admin/job-openings/:id" element={<PublishedJDDetail />} />
        </Route>

        {/* HR Routes with persistent Sidebar */}
        <Route element={<ProtectedHRLayout />}>
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/my-jds" element={<HRMyJDs />} />
          <Route path="/hr/jd/:id" element={<JDDetail />} />
          <Route path="/hr/csod-jd/:ouid" element={<CSODJDView />} />
          <Route path="/hr/generate" element={<GenerateJD />} />
          <Route path="/hr/generate/:id" element={<GenerateJD />} />
          <Route path="/hr/generate/manual/:id" element={<ManualJDEditor />} />
          <Route path="/hr/templates" element={<Templates />} />
          <Route path="/hr/job-openings" element={<JobOpenings />} />
          <Route path="/hr/job-openings/:id" element={<PublishedJDDetail />} />
        </Route>

        {/* Manager Routes with persistent Sidebar */}
        <Route element={<ProtectedManagerLayout />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/review/:id" element={<ReviewCollaborate />} />
          <Route path="/manager/my-jds" element={<ManagerMyJDs />} />
          <Route path="/manager/generate/manual/:id" element={<ManualJDEditor />} />
          <Route path="/manager/job-openings" element={<JobOpenings />} />
          <Route path="/manager/job-openings/:id" element={<PublishedJDDetail />} />
        </Route>

        {/* End User Routes with persistent Sidebar */}
        <Route element={<ProtectedEndUserLayout />}>
          <Route path="/enduser/dashboard" element={<EndUserDashboard />} />
          <Route path="/enduser/performance" element={<MyPerformance />} />
          <Route path="/enduser/inbox" element={<InboxTasks />} />
          <Route path="/enduser/job-openings" element={<JobOpenings />} />
          <Route path="/enduser/job-openings/:id" element={<PublishedJDDetail />} />

          <Route path="/enduser/jd-review/:id" element={<JDReview />} />
        </Route>

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/terms" element={<TermsAndConditionsPage />} />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <PageLayout>
              <NotificationsPage />
            </PageLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;