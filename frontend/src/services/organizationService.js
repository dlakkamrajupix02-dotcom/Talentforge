import { apiPost, apiGet, apiDelete, apiPatch } from "./apiClient";

/**
 * Service to handle organization-level operations.
 */

/**
 * Shared Image Library
 */

export const uploadOrgImage = async (formData) => {
    return await apiPost("/organizations/images/", formData);
};

export const listOrgImages = async () => {
    return await apiGet("/organizations/images/");
};

export const deleteOrgImage = async (id) => {
    return await apiDelete(`/organizations/images/${id}`);
};


/**
 * Fetches managers in the current organization with optional status filtering.
 * @param {string} status - Filter by 'active' or 'inactive'
 */
export const getManagers = async (status) => {
    try {
        const query = status ? `?status=${status}` : '';
        return await apiGet(`/organizations/managers${query}`);
    } catch (error) {
        console.error("Fetch Managers API failed:", error);
        throw error;
    }
};

/**
 * Creates a new organization member.
 * Only accessible by Admin role.
 * @param {Object} data - { full_name, email, password, role }
 */
export const createMember = async (data) => {
    try {
        return await apiPost("/organizations/members", data);
    } catch (error) {
        console.error("Create Organizational Member API failed:", error);
        throw error;
    }
};

/**
 * Competency Library
 */

export const getCompetencies = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiGet(`/extra/competencies?${query}`);
};

export const addCompetency = async (data) => {
    return await apiPost("/extra/competencies", data);
};

export const deleteCompetency = async (id) => {
    return await apiDelete(`/extra/competencies/${id}`);
};
/**
 * Creates a new candidate user (End-user).
 * Only accessible by Admin role.
 * @param {Object} data - { full_name, email, password, company_name, employee_id }
 */
export const createCandidateUser = async (data) => {
    try {
        return await apiPost("/candidate-users/", data);
    } catch (error) {
        console.error("Create Candidate User API failed:", error);
        throw error;
    }
};

/**
 * Updates an existing candidate user (End-user).
 * Only accessible by Admin role.
 * @param {string} email - Candidate's email
 * @param {Object} data - { full_name, email, password, company_name, employee_id }
 */
export const updateCandidateUser = async (email, data) => {
    try {
        return await apiPatch(`/candidate-users/by-email/${email}`, data);
    } catch (error) {
        console.error("Update Candidate User API failed:", error);
        throw error;
    }
};

/**
 * Soft deletes an existing candidate user (End-user).
 * Only accessible by Admin role.
 * @param {string} email - Candidate's email
 */
export const deleteCandidateUser = async (email) => {
    try {
        return await apiDelete(`/candidate-users/by-email/${email}`);
    } catch (error) {
        console.error("Delete Candidate User API failed:", error);
        throw error;
    }
};

/**
 * Allots a JD to a candidate user by email.
 * @param {string} email - Candidate's email
 * @param {Object} payload - { jd_id, due_date, status }
 */
export const allotJDToCandidate = async (email, payload) => {
    try {
        return await apiPost(`/candidate-users/by-email/${email}/allot-jd`, payload);
    } catch (error) {
        console.error("Allot JD API failed:", error);
        throw error;
    }
};

/**
 * Bulk allots a JD to multiple candidates.
 * @param {Object} payload - { jd_id, data: [{email, due_date}] }
 */
export const bulkAssignJD = async (payload) => {
    try {
        return await apiPost(`/candidate-users/bulk_assign_jd`, payload);
    } catch (error) {
        console.error("Bulk Assign JD API failed:", error);
        throw error;
    }
};

/**
 * Fetches all JD assignments.
 */
export const getAllAssignments = async () => {
    try {
        return await apiGet("/candidate-users/all-assignments");
    } catch (error) {
        console.error("Fetch Assignments API failed:", error);
        throw error;
    }
};

/**
 * Fetches details for a specific assigned JD.
 * @param {string|number} id - Assignment ID
 */
export const getAssignedJDDetails = async (id) => {
    try {
        return await apiGet(`/api/assigned-jds/details/${id}`);
    } catch (error) {
        console.error("Fetch Assigned JD Details failed:", error);
        throw error;
    }
};

/**
 * Lists all candidate users.
 */
export const listCandidateUsers = async () => {
    try {
        return await apiGet("/candidate-users/");
    } catch (error) {
        console.error("List Candidate Users API failed:", error);
        throw error;
    }
};

/**
 * Removes an existing JD assignment.
 * @param {string|number} assignmentId 
 */
export const removeAssignment = async (assignmentId) => {
    try {
        return await apiDelete(`/api/assigned-jds/delete/${assignmentId}`);
    } catch (error) {
        console.error("Remove Assignment API failed:", error);
        throw error;
    }
};

/**
 * Email Groups
 */

/**
 * List all email groups for the current user's organization.
 */
export const getEmailGroups = async () => {
    try {
        return await apiGet("/extra/email-groups");
    } catch (error) {
        console.error("List Email Groups API failed:", error);
        throw error;
    }
};

/**
 * Create a new email group for the organization (Admin only).
 * @param {Object} data - { group_name, role, emails }
 */
export const createEmailGroup = async (data) => {
    try {
        return await apiPost("/extra/email-groups", data);
    } catch (error) {
        console.error("Create Email Group API failed:", error);
        throw error;
    }
};

/**
 * Get a specific email group by name.
 * @param {string} groupName 
 */
export const getEmailGroup = async (groupName) => {
    try {
        return await apiGet(`/extra/email-groups/${encodeURIComponent(groupName)}`);
    } catch (error) {
        console.error("Get Email Group API failed:", error);
        throw error;
    }
};

/**
 * Update an email group (Admin only).
 * @param {string} groupName 
 * @param {Object} data - { group_name, role, emails }
 */
export const updateEmailGroup = async (groupName, data) => {
    try {
        return await apiPatch(`/extra/email-groups/${encodeURIComponent(groupName)}`, data);
    } catch (error) {
        console.error("Update Email Group API failed:", error);
        throw error;
    }
};

/**
 * Delete an email group (Admin only).
 * @param {string} groupName 
 */
export const deleteEmailGroup = async (groupName) => {
    try {
        return await apiDelete(`/extra/email-groups/${encodeURIComponent(groupName)}`);
    } catch (error) {
        console.error("Delete Email Group API failed:", error);
        throw error;
    }
};

/**
 * Bulk Import and Templates
 */

export const downloadTemplate = async (type) => {
    // type: "regular" or "enduser"
    const { apiDownload } = await import('./apiClient');
    const filename = type === "regular" ? "Regular_Users_Template.xlsx" : "End_Users_Template.xlsx";
    return await apiDownload(`/extra/download-template/${type}`, filename);
};

export const bulkImportUsers = async (type, formData) => {
    // type: "regular" or "enduser"
    try {
        const endpoint = type === "regular" ? "/extra/bulk-create/regular-users" : "/extra/bulk-create/end-users";
        return await apiPost(endpoint, formData);
    } catch (error) {
        console.error("Bulk Import Users API failed:", error);
        throw error;
    }
};

/**
 * Toggles the active/inactive status of a user by email (Admin only).
 * @param {string} email - User's email
 */
export const toggleStatusByEmail = async (email) => {
    try {
        return await apiPatch(`/extra/toggle-status/${encodeURIComponent(email)}`, {});
    } catch (error) {
        console.error("Toggle User Status API failed:", error);
        throw error;
    }
};

/**
 * Updates the role of a user by email (Admin only).
 * @param {string} email - User's email
 * @param {string} role - New role name (e.g. Admin, Manager, HR, User)
 */
export const updateUserRole = async (email, role) => {
    try {
        return await apiPatch(`/extra/user/role?email=${encodeURIComponent(email)}`, { role });
    } catch (error) {
        console.error("Update User Role API failed:", error);
        throw error;
    }
};

