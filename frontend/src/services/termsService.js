import { apiGet, apiPost, apiPatch, apiDelete } from "./apiClient";

/**
 * Terms and Conditions Service
 */

export const getTermsList = async () => {
    try {
        return await apiGet("/terms-and-conditions/");
    } catch (error) {
        console.error("Fetch Terms List API failed:", error);
        throw error;
    }
};

export const getActiveTerms = async () => {
    try {
        return await apiGet("/terms-and-conditions/active");
    } catch (error) {
        console.error("Fetch Active Terms API failed:", error);
        throw error;
    }
};

export const createTerms = async (data) => {
    try {
        return await apiPost("/terms-and-conditions/", data);
    } catch (error) {
        console.error("Create Terms API failed:", error);
        throw error;
    }
};

export const updateTerms = async (id, data) => {
    try {
        return await apiPatch(`/terms-and-conditions/${id}`, data);
    } catch (error) {
        console.error("Update Terms API failed:", error);
        throw error;
    }
};

export const deleteTerms = async (id) => {
    try {
        return await apiDelete(`/terms-and-conditions/${id}`);
    } catch (error) {
        console.error("Delete Terms API failed:", error);
        throw error;
    }
};
