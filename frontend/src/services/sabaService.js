import { apiGet, apiPost, apiPatch, apiDelete } from "./apiClient";

const SABA_BASE_PATH = "/saba";

/**
 * Fetch all Saba JDs
 * GET /saba/
 */
export const getSabaJds = async () => {
    return await apiGet(`${SABA_BASE_PATH}/`);
};

/**
 * Fetch Saba JD by Job ID
 * GET /saba/by_job_id/{job_id}
 * @param {string} jobId - The Job ID
 */
export const getSabaJdByJobId = async (jobId) => {
    return await apiGet(`${SABA_BASE_PATH}/by_job_id/${jobId}`);
};

/**
 * Fetch Saba JD by JD ID
 * GET /saba/{jd_id}
 * @param {string} jdId - The JD ID
 */
export const getSabaJd = async (jdId) => {
    return await apiGet(`${SABA_BASE_PATH}/${jdId}`);
};

/**
 * Upload Saba PDFs (Supports Bulk)
 * POST /saba/upload_pdf
 * @param {File[]} files - Array of PDF files
 */
export const uploadSabaPdf = async (files) => {
    const formData = new FormData();
    if (Array.isArray(files)) {
        files.forEach(f => formData.append("files", f));
    } else {
        formData.append("files", files); // Fallback if single file passed
    }
    return await apiPost(`${SABA_BASE_PATH}/upload_pdf`, formData);
};

/**
 * Upload Saba Job Description Documents (Supports Multiple Formats)
 * POST /saba/upload
 * @param {File[]} files - Array of files (.pdf, .doc, .docx, .html, .htm, .txt, .rtf, .word)
 */
export const uploadSabaDocuments = async (files) => {
    const formData = new FormData();
    if (Array.isArray(files)) {
        files.forEach(f => formData.append("files", f));
    } else {
        formData.append("files", files);
    }
    return await apiPost(`${SABA_BASE_PATH}/upload`, formData);
};

/**
 * Fetch supported import formats from backend
 * GET /saba/supported_formats
 */
export const getSabaSupportedFormats = async () => {
    return await apiGet(`${SABA_BASE_PATH}/supported_formats`);
};

/**
 * Bulk Convert Saba JDs to Standard JDs
 * POST /saba/bulk_convert
 * @param {Object} payload - { jd_ids: ["uuid1", "uuid2"] }
 */
export const bulkConvertSabaJds = async (payload) => {
    return await apiPost(`${SABA_BASE_PATH}/bulk_convert`, payload);
};

/**
 * Export Saba JD (PDF or Word)
 * POST /saba/{jd_id}/export?format={format}
 * @param {string} jdId - The JD ID
 * @param {string} format - "pdf" or "word"
 */
export const exportSabaJd = async (jdId, format = "pdf") => {
    const response = await apiPost(`${SABA_BASE_PATH}/${jdId}/export?format=${format}`, {}, { responseType: 'blob' });
    return response;
};

/**
 * Update a Saba JD by ID
 * PATCH /saba/{jd_id}
 * @param {string} jdId - The ID of the Saba JD to update
 * @param {Object} payload - The update payload
 */
export const updateSabaJd = async (jdId, payload) => {
    return await apiPatch(`${SABA_BASE_PATH}/${jdId}`, payload);
};

/**
 * Update Saba JD sections by ID
 * PATCH /saba/{jd_id}/sections
 * @param {string} jdId - The ID of the Saba JD to update
 * @param {Object} payload - The sections update payload
 */
export const updateSabaJdSections = async (jdId, payload) => {
    return await apiPatch(`${SABA_BASE_PATH}/${jdId}/sections`, payload);
};

/**
 * Delete a Saba JD by ID
 * DELETE /saba/{jd_id} 
 * @param {string} jdId - The ID of the Saba JD to delete
 */
export const deleteSabaJd = async (jdId) => {
    return await apiDelete(`${SABA_BASE_PATH}/${jdId}`);
};
