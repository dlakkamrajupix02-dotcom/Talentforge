import { apiGet, apiPost } from './apiClient';

const SESSION_KEY = 'tf_feedback_session_recorded';
const PROMPTED_KEY = 'tf_feedback_prompted_session';

export const wasFeedbackPromptedThisSession = () => sessionStorage.getItem(PROMPTED_KEY) === '1';

export const markFeedbackPromptedThisSession = () => {
  sessionStorage.setItem(PROMPTED_KEY, '1');
};

export const recordFeedbackSession = async () => {
  if (sessionStorage.getItem(SESSION_KEY) === '1') return null;
  const result = await apiPost('/feedback/session', {});
  sessionStorage.setItem(SESSION_KEY, '1');
  return result;
};

export const recordFeedbackEvent = async (eventType, metadata = {}) => {
  return await apiPost('/feedback/events', { event_type: eventType, metadata });
};

export const getFeedbackPrompt = async (trigger = 'session_milestone') => {
  return await apiGet(`/feedback/prompt?trigger=${encodeURIComponent(trigger)}`);
};

export const dismissFeedbackPrompt = async () => {
  markFeedbackPromptedThisSession();
  return await apiPost('/feedback/dismiss', {});
};

export const submitPlatformFeedback = async (payload) => {
  markFeedbackPromptedThisSession();
  return await apiPost('/feedback', payload);
};

/** Call after a success moment — shows prompt only if backend says eligible. */
export const dispatchFeedbackPrompt = (prompt, trigger) => {
  window.dispatchEvent(new CustomEvent('tf:feedback-prompt', { detail: { prompt, trigger } }));
};

export const maybePromptAfterSuccess = async (eventType, metadata = {}) => {
  if (wasFeedbackPromptedThisSession()) return;
  try {
    const result = await recordFeedbackEvent(eventType, metadata);
    if (result?.eligible && result?.prompt) {
      markFeedbackPromptedThisSession();
      setTimeout(() => dispatchFeedbackPrompt(result.prompt, eventType), 1800);
    }
  } catch (error) {
    console.error('Feedback event failed:', error);
  }
};
