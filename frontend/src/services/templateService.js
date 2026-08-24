import { apiGet, apiPost } from "./apiClient";

function buildTemplatesQuery(params = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const rawLimit = Number(params.limit) || 50;
  const limit = Math.min(100, Math.max(1, rawLimit));

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));

  const country =
    params.country_code &&
    params.country_code !== "All"
      ? String(params.country_code).trim()
      : "";
  if (country) searchParams.set("country_code", country);

  const industry =
    params.industry && params.industry !== "All"
      ? String(params.industry).trim()
      : "";
  if (industry) searchParams.set("industry", industry);

  const region =
    params.region && params.region !== "All"
      ? String(params.region).trim()
      : "";
  if (region) searchParams.set("region", region);

  const title = params.title ? String(params.title).trim() : "";
  if (title) searchParams.set("title", title);

  let qs = searchParams.toString();
  if (industry === "Hospital") {
    // Inject the exact format requested by the user for Hospital
    qs = qs.replace("industry=Hospital", "industry=Hospital&Hospital+Administration");
  }

  return `/templates/?${qs}`;
}

export const getTemplates = async (params = {}) => {
  try {
    const endpoint = buildTemplatesQuery(params);
    const data = await apiGet(endpoint);

    if (!data) return { templates: [], total: 0, page: 1, limit: 50 };
    
    // Support both old array-only response and new paginated object response
    if (Array.isArray(data)) {
      return { templates: data, total: data.length, page: 1, limit: data.length };
    }

    return {
      templates: data.templates || [],
      total: data.total ?? 0,
      page: data.page,
      limit: data.limit
    };
  } catch (error) {
    console.error("Get Templates API failed:", error);
    throw error;
  }
};

export const getTemplateById = async (id) => {
    try {
        return await apiGet(`/templates/${id}`);
    } catch (error) {
        console.error(`Get template ${id} failed:`, error);
        throw error;
    }
}

export const usePublicTemplate = async (templateId) => {
  try {
    return await apiPost(`/templates/public/${templateId}/use`, {});
  } catch (error) {
    console.error(`Use template ${templateId} failed:`, error);
    throw error;
  }
};

export const getTemplateIndustries = async () => {
  try {
    return await apiGet(`/templates/industries`);
  } catch (error) {
    console.error("Get Template Industries failed:", error);
    return [];
  }
};


