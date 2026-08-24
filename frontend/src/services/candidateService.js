import { apiGet, apiPost, apiPut, BASE_URL } from './apiClient';

// Candidate Dashboard & Task Management APIs

export const getMyTasks = async (status) => {
  try {
    const url = status ? `/candidate-users/my-tasks?status=${status}` : '/candidate-users/my-tasks';
    return await apiGet(url);
  } catch (error) {
    console.error('Failed to fetch candidate tasks:', error);
    throw error;
  }
};

export const getAppraisalDetail = async (appraisalId) => {
  try {
    return await apiGet(`/candidate-users/appraisal/${appraisalId}`);
  } catch (error) {
    console.error(`Failed to fetch appraisal ${appraisalId}:`, error);
    throw error;
  }
};

export const submitAppraisal = async (appraisalId, data) => {
  try {
    return await apiPost(`/candidate-users/appraisal/${appraisalId}/submit`, data);
  } catch (error) {
    console.error(`Failed to submit appraisal ${appraisalId}:`, error);
    throw error;
  }
};

export const getJDContent = async (id) => {
  try {
    return await apiGet(`/api/assigned-jds/details/${id}`);
  } catch (error) {
    console.error(`Failed to fetch JD details for assignment ${id}:`, error);
    throw error;
  }
};

export const submitCandidateDecision = async (email, data) => {
  try {
    return await apiPost(`/candidate-users/by-email/${encodeURIComponent(email)}/decision`, data);
  } catch (error) {
    console.error(`Failed to submit candidate decision:`, error);
    throw error;
  }
};

export const getPerformanceHistory = async () => {
  try {
    return await apiGet(`/candidate-users/performance-history`);
  } catch (error) {
    console.error(`Failed to fetch performance history:`, error);
    throw error;
  }
};

export const getDashboardSummary = async () => {
  try {
    return await apiGet(`/candidate-users/dashboard-summary`);
  } catch (error) {
    console.error(`Failed to fetch dashboard summary:`, error);
    throw error;
  }
};

export const uploadSignature = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    return await apiPost('/candidate-users/upload-signature', formData);
  } catch (error) {
    console.error('Failed to upload signature:', error);
    throw error;
  }
};

export const updateAssignedJD = async (id, data) => {
  try {
    return await apiPut(`/api/assigned-jds/update/${id}`, data);
  } catch (error) {
    console.error(`Failed to update assigned JD ${id}:`, error);
    throw error;
  }
};

export const downloadSignedPdf = async (assignmentId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/assigned-jds/download-signed-pdf/${assignmentId}`, {
      method: "GET",
      credentials: "include",
      headers: { accept: 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Failed to download signed PDF:', error);
    throw error;
  }
};

export const getAppliedJobs = async () => {
  try {
    return await apiGet('/applications/');
  } catch (error) {
    console.error('Failed to fetch applied jobs:', error);
    throw error;
  }
};
