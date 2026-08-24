import { apiGet, apiPost, apiDelete } from "./apiClient";

/**
 * Service to handle Job Description approval workflows and runs.
 */

export const listWorkflows = async () => {
    try {
        return await apiGet("/jd/workflow/list_all_workflows");
    } catch (error) {
        console.error("List Workflows API failed:", error);
        throw error;
    }
};

export const getWorkflowRunStatus = async (jdId) => {
    try {
        return await apiGet(`/jd/workflow/jd_state/${jdId}`);
    } catch (error) {
        // Return null for 404 to avoid breaking the UI for finished/not-started workflows
        if (error.status === 404) return null;
        console.error(`Fetch Workflow Run for ${jdId} failed:`, error);
        throw error;
    }
};

export const getJDHistory = async (jdId) => {
    try {
        return await apiGet(`/jd/history/${jdId}`);
    } catch (error) {
        console.error(`Fetch History for ${jdId} failed:`, error);
        throw error;
    }
};

export const createWorkflow = async (data) => {
    try {
        return await apiPost("/jd/workflow/create_workflow", data);
    } catch (error) {
        console.error("Create Workflow API failed:", error);
        throw error;
    }
};

export const deleteWorkflow = async (id) => {
    try {
        return await apiDelete(`/jd/workflow/delete/${id}`);
    } catch (error) {
        console.error(`Delete Workflow ${id} failed:`, error);
        throw error;
    }
};

export const triggerWorkflow = async (jdId, workflowId, comment = "") => {
    try {
        const payload = {
            jd_id: jdId,
            workflow_id: workflowId,
            comment: (comment && comment.trim()) ? comment : "Review requested"
        };
        console.log("[workflowService] Triggering /jd/workflow/start_event with payload:", payload);
        return await apiPost("/jd/workflow/start_workflow_event", payload);
    } catch (error) {
        console.error(`Trigger Workflow for ${jdId} failed:`, error);
        throw error;
    }
};

export const bulkTriggerWorkflow = async (jdIds, workflowId, comment = "") => {
    try {
        const payload = {
            jd_ids: jdIds,
            workflow_id: workflowId,
            comment: (comment && comment.trim()) ? comment : "Bulk review requested"
        };
        console.log("[workflowService] Triggering /jd/workflow/bulk_workflow_event with payload:", payload);
        return await apiPost("/jd/workflow/bulk_workflow_event", payload);
    } catch (error) {
        console.error(`Bulk Trigger Workflow for ${jdIds} failed:`, error);
        throw error;
    }
};

export const decideOnWorkflow = async (jdId, decision, comment = "") => {
    try {
        return await apiPost("/jd/workflow/workflow_decision", {
            jd_id: jdId,
            decision,
            comment
        });
    } catch (error) {
        console.error(`Decision on Workflow for ${jdId} failed:`, error);
        throw error;
    }
};

export const getReceivedJDs = async () => {
    try {
        return await apiGet("/jd/received");
    } catch (error) {
        console.error("Fetch Received JDs failed:", error);
        throw error;
    }
};

export const listWorkflowMembers = async () => {
    try {
        return await apiGet("/organizations/members");
    } catch (error) {
        console.error("List Workflow Members failed:", error);
        throw error;
    }
};
