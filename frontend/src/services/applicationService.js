import { apiGet, apiPost, BASE_URL } from "./apiClient";

export const getApplications = async (publicJdId, status = null) => {
  try {
    let url = `/applications/?public_jd_id=${encodeURIComponent(publicJdId)}`;
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }
    // bypassCache is set to true to ensure fresh applicants list
    return await apiGet(url, true);
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    throw error;
  }
};

export const submitApplication = async (payload) => {
  try {
    return await apiPost("/applications/submit", payload);
  } catch (error) {
    console.error("Failed to submit application:", error);
    throw error;
  }
};

export const exportApplicationsExcel = async (publicJdId) => {
  try {
    const response = await fetch(`${BASE_URL}/applications/export/excel?public_jd_id=${encodeURIComponent(publicJdId)}`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Failed to export Excel file: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    console.error("Failed to export applications to excel:", error);
    throw error;
  }
};
