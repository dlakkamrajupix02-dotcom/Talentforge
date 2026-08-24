import { apiGet, apiPost, apiPatch, apiDelete } from './apiClient';

export const superAdminService = {
  // --- Organizations ---
  getOrgMembersByName: async (orgName) => {
    // Manually append query parameters since apiGet doesn't take a params object
    return await apiGet(`/super-admin/organizations/members-by-name?org_name=${encodeURIComponent(orgName)}`);
  },

  getAllOrganizations: async () => {
    return await apiGet('/super-admin/organizations');
  },

  updateOrganization: async (orgId, payload) => {
    return await apiPatch(`/super-admin/organizations/${orgId}`, payload);
  },

  updateOrganizationAccess: async (orgId, payload) => {
    return await apiPatch(`/super-admin/organizations/${orgId}/access`, payload);
  },

  createOrgWithAdmin: async (formData) => {
    return await apiPost('/super-admin/organizations/with-admin', formData);
  },

  createOrgMember: async (orgId, payload) => {
    return await apiPost(`/super-admin/organizations/${orgId}/members`, payload);
  },

  // --- Analytics ---
  getJdAnalytics: async () => {
    return await apiGet('/super-admin/analytics/jds');
  },

  getPlatformOverview: async () => {
    return await apiGet('/super-admin/analytics/platform-overview');
  },

  getFeedbackAnalytics: async (limit = 200) => {
    return await apiGet(`/super-admin/analytics/feedback?limit=${limit}`);
  },

  // --- Broadcasts ---
  getAllBroadcasts: async () => {
    return await apiGet('/super-admin/broadcasts');
  },

  getActiveBroadcasts: async () => {
    return await apiGet('/super-admin/broadcasts/active');
  },

  createBroadcast: async (payload) => {
    return await apiPost('/super-admin/broadcasts', payload);
  },

  updateBroadcast: async (broadcastId, payload) => {
    return await apiPatch(`/super-admin/broadcasts/${broadcastId}`, payload);
  },

  deleteBroadcast: async (broadcastId) => {
    return await apiDelete(`/super-admin/broadcasts/${broadcastId}`);
  }
};
