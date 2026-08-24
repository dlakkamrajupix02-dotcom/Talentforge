import { mockJD, getMockJDByTitle } from "../mock/mockJD";

import { apiPost, apiGet, apiPatch, apiPut, apiDelete, BASE_URL, getAccessToken } from "./apiClient";

const exportRequestHeaders = () => {
  const headers = {};
  const csrfToken = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)?.[1];
  if (csrfToken) {
    headers["X-CSRF-Token"] = decodeURIComponent(csrfToken);
  }
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};



export const generateJD = async (data) => {

  console.log("Generating JD with:", data);

  return await apiPost("/job_descriptions/generate", data);

};



export const createSkeletonJD = async (payload = { title: "Offline creation", industry: "Offline" }) => {

  try {

    return await apiPost("/job_descriptions/skeleton", payload);

  } catch (error) {

    console.error("Create skeleton JD API failed:", error);

    throw error;

  }

};







export const getMyJDs = async (sort = "newest_first") => {
  return await apiGet(`/job_descriptions/?sort=${sort}`);
};



export const createFromTemplate = async (templateId, formData = {}) => {

    try {

        return await apiPost("/job_descriptions/create-from-template", { 

          template_id: templateId,

          ...formData 

        });

    } catch (error) {

        console.error("Create from template failed:", error);

        throw error;

    }

};



export const finalizeJD = async (id) => {

    try {

        return await apiPatch(`/job_descriptions/${id}/finalize`, {});

    } catch (error) {

        console.error("Finalize JD failed:", error);

        throw error;

    }

};



export const pushJDToCSODStatus = async (id) => {

    try {

        return await apiPatch(`/job_descriptions/${id}/push-to-csod`, {});

    } catch (error) {

        console.error("Push to CSOD status update failed:", error);

        throw error;

    }

};



export const autosaveJD = async (id, data) => {

    try {

        return await apiPatch(`/job_descriptions/${id}/autosave`, data);

    } catch (error) {

        console.error("Autosave JD failed:", error);

        throw error;

    }

};



export const deleteJD = async (id) => {

    try {

        return await apiDelete(`/job_descriptions/${id}`);

    } catch (error) {

        console.error("Delete JD failed:", error);

        throw error;

    }

};


export const archiveJD = async (id) => {

    try {

        return await apiPatch(`/job_descriptions/${id}/archive`, {});

    } catch (error) {

        console.error("Archive JD failed:", error);

        throw error;

    }

};



// EXPORT APIS

export const exportPDF = async (id, title = "") => {
  try {
    const response = await fetch(`${BASE_URL}/job_descriptions/${id}/export/pdf`, {
      method: 'POST',
      credentials: 'include',
      headers: exportRequestHeaders(),
    });

    

    if (!response.ok) throw new Error('Download failed');

    

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : `JD-${id}.pdf`;

    a.download = filename;

    document.body.appendChild(a);

    a.click();

    window.URL.revokeObjectURL(url);

    document.body.removeChild(a);

  } catch (error) {

    console.error("Export PDF failed:", error);

    throw error;

  }

};



export const exportWord = async (id, title = "") => {
  try {
    const response = await fetch(`${BASE_URL}/job_descriptions/${id}/export/word`, {
      method: 'POST',
      credentials: 'include',
      headers: exportRequestHeaders(),
    });

    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx` : `JD-${id}.docx`;

    a.download = filename;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);

  } catch (error) {

    console.error("Export Word failed:", error);

    throw error;

  }

};





export const exportClipboard = async (id) => {

  try {

    return await apiPost(`/job_descriptions/${id}/export/clipboard`, {});

  } catch (error) {

    console.error("Export Clipboard failed:", error);

    throw error;

  }

};



export const listJDIds = async (status = null) => {

  try {

    let url = "/job_descriptions/org/list_jd-ids";

    if (status) url += `?status=${status}`;

    return await apiGet(url);

  } catch (error) {

    console.error("List JD IDs API failed:", error);

    throw error;

  }

};



export const listPushRecords = async (type = null) => {

  try {

    let url = "/foundation/push-records";

    if (type) url += `?pipeline_type=${type}`;

    return await apiGet(url);

  } catch (error) {

    console.error("List push records failed:", error);

    throw error;

  }

};



export const getJDById = async (id) => {
  return await apiGet(`/job_descriptions/${id}`);
};

export const revertJDToDraft = async (id) => {
  return await apiPost(`/job_descriptions/${id}/revert-to-draft`, {});
};



// SECTION MUTATIONS

export const updateSection = async (id, sectionName, content) => {

  try {

    return await apiPatch(`/job_descriptions/${id}/update_section`, {

      section: sectionName,

      value: content

    });

  } catch (error) {

    console.error(`Update section ${sectionName} failed:`, error);

    throw error;

  }

};



export const updateSectionOrder = async (id, orderArray) => {
  try {
    return await updateSection(id, "sections_order", orderArray);
  } catch (error) {
    console.error(`Update section order for JD ${id} failed:`, error);
    throw error;
  }
};



export const deleteSection = async (id, sectionName) => {

  try {

    return await apiDelete(`/job_descriptions/${id}/section/${sectionName}`);

  } catch (error) {

    console.error(`Delete section ${sectionName} for JD ${id} failed:`, error);

    throw error;

  }

};



export const regenerateSection = async (sectionName, existingData, modificationRequest, jdContext = {}, regenerateMeta = {}) => {

  try {

    return await apiPost(`/job_descriptions/regenerate_section`, {

      section_name: sectionName,
      existing_data: existingData,
      modification_request: modificationRequest,
      section_label: regenerateMeta.sectionLabel,
      section_type: regenerateMeta.sectionType,
      title: jdContext.title,
      department: jdContext.department,
      industry: jdContext.industry,
      seniority: jdContext.seniority,
      location: jdContext.location,
      country_code: jdContext.country_code || jdContext.countryCode,
      salary_range: jdContext.salary_range || jdContext.salaryRange

    });

  } catch (error) {
    console.error(`Regenerate section ${sectionName} failed:`, error);
    throw error;
  }
};



export const regeneratePoint = async (sectionName, existingData, modificationRequest) => {

  try {

    return await apiPost(`/job_descriptions/regenerate_point`, {

      section_name: sectionName,

      existing_data: existingData,

      modification_request: modificationRequest

    });

  } catch (error) {

    console.error(`Regenerate point failed:`, error);

    throw error;

  }

};



export const updateWordLimits = async (limits) => {

  try {

    return await apiPatch("/job_descriptions/word_limits", limits);

  } catch (error) {

    console.error("Update word limits failed:", error);

    throw error;

  }

};



export const delegateWorkflowStep = async (jdId, delegateToEmail, comment) => {

  try {

    return await apiPost(`/jd/workflow/${jdId}/delegate`, {

      delegate_to_email: delegateToEmail,

      comment: comment

    });

  } catch (error) {

    console.error(`Delegate workflow step for JD ${jdId} failed:`, error);

    throw error;

  }

};



export const getAvailableModels = async () => {

  try {

    return await apiGet("/job_descriptions/models/available");

  } catch (error) {

    console.error("Failed to fetch available models:", error);

    throw error;

  }

};







export const getCSODOUByExternalId = async (externalId) => {

  try {

    return await apiGet(`/csod/ous/by-external-id/${externalId}`);

  } catch (error) {

    console.error(`Get CSOD OU by external ID ${externalId} failed:`, error);

    throw error;

  }

};



export const updateJDStatus = async (id, status) => {

  try {

    return await apiPatch(`/job_descriptions/${id}/status`, { status });

  } catch (error) {

    console.error(`Update JD status to ${status} failed:`, error);

    throw error;

  }

};



export const bulkUpdateJDStatus = async (fromStatus, toStatus, jdIds) => {

  try {

    return await apiPatch("/job_descriptions/bulk/status", {

      from_status: fromStatus,

      to_status: toStatus,

      jd_ids: jdIds

    });

  } catch (error) {

    console.error(`Bulk update JD status from ${fromStatus} to ${toStatus} failed:`, error);

    throw error;

  }

};



export const getOrgPublicJDs = async (employmentType = null, skip = 0, limit = 1000, status = null) => {

  try {

    let url = `/job_descriptions/org/public_jds?skip=${skip}&limit=${limit}`;

    if (status) {

      url += `&status=${encodeURIComponent(status)}`;

    }

    if (employmentType) {

      url += `&employment_type=${encodeURIComponent(employmentType)}`;

    }

    return await apiGet(url);

  } catch (error) {

    console.error("Get Org Public JDs failed:", error);

    throw error;

  }

};