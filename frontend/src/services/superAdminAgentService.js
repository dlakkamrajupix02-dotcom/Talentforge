import { apiGet, apiPost } from './apiClient';

export const superAdminAgentService = {
  /**
   * Send natural language query to Super Admin AI Agent
   * @param {Object} payload - { prompt: string, chat_history?: Array, model_name?: string }
   */
  chat: async (payload) => {
    return await apiPost('/super-admin/agent/chat', payload);
  },

  /**
   * Fetch quick-start prompt suggestions for Super Admin
   */
  getSuggestions: async () => {
    return await apiGet('/super-admin/agent/suggestions');
  },

  /**
   * Fetch list of available Mistral LLM models
   */
  getModels: async () => {
    return await apiGet('/super-admin/agent/models');
  },
};
