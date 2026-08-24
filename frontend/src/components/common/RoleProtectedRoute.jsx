import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import { getDashboardPathForRole, isSuperAdminRole, isOrgAdminRole, isHrRole, isManagerRole, isEndUserRole } from "../../utils/roles";

export default function RoleProtectedRoute({ allowedRoles, children, fallbackPath = "/" }) {
  const { user, isAuthenticated } = useContext(JDContext);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const userRole = user.role || "";
  const allowed = allowedRoles.map((role) => String(role).toLowerCase());

  const isAuthorized = allowed.some((role) => {
    if (["superadmin", "super-admin", "super_admin"].includes(role)) {
      return isSuperAdminRole(userRole);
    }
    if (role === "admin") {
      return isOrgAdminRole(userRole);
    }
    if (role === "hr") {
      return isHrRole(userRole);
    }
    if (role === "manager") {
      return isManagerRole(userRole);
    }
    if (role === "enduser" || role === "user") {
      return isEndUserRole(userRole);
    }
    return userRole.toLowerCase().includes(role);
  });

  if (!isAuthorized) {
    console.warn(`Unauthorized access attempt by ${user.role} to ${location.pathname}`);
    return <Navigate to={getDashboardPathForRole(userRole) || fallbackPath} replace />;
  }

  return children;
}
