export const normalizeRole = (role) =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');

export const isSuperAdminRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'super_admin' || normalized === 'superadmin';
};

export const isOrgAdminRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'admin';
};

export const isHrRole = (role) => normalizeRole(role) === 'hr';

export const isManagerRole = (role) => normalizeRole(role) === 'manager';

export const isEndUserRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'user' || normalized === 'enduser' || normalized === 'end_user';
};

export const getDashboardPathForRole = (role) => {
  if (isSuperAdminRole(role)) return '/superadmin/dashboard';
  if (isOrgAdminRole(role)) return '/admin/dashboard';
  if (isHrRole(role)) return '/hr/dashboard';
  if (isManagerRole(role)) return '/manager/dashboard';
  if (isEndUserRole(role)) return '/enduser/dashboard';
  return '/login';
};

/** Resolve where a global search JD result should open for the current role. */
export const getSearchResultPath = (role, jd) => {
  const id = jd?.id;
  if (!id) return getDashboardPathForRole(role);

  const status = String(jd?.status || '').toLowerCase();
  const isPublished = ['public_view', 'published', 'pushed_to_csod', 'push_to_csod', 'pushed'].includes(status);

  if (isManagerRole(role)) return `/manager/review/${id}`;
  if (isHrRole(role)) return isPublished ? `/hr/job-openings/${id}` : `/hr/jd/${id}`;
  if (isOrgAdminRole(role)) return isPublished ? `/admin/job-openings/${id}` : `/admin/view/${id}`;

  return getDashboardPathForRole(role);
};

/** Super admins search orgs on dashboard only; end users use inbox — hide JD search elsewhere. */
export const shouldShowGlobalSearch = (pathname, role) => {
  if (isSuperAdminRole(role)) return pathname === '/superadmin/dashboard';
  if (isEndUserRole(role)) return false;
  return true;
};
