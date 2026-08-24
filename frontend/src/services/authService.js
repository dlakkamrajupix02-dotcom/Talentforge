import { apiPost, apiGet, apiDelete, apiPatch, setAccessToken, clearAccessToken } from "./apiClient";

export const login = async (credentials) => {
  const data = await apiPost("/auth/login", {
    username_or_email: credentials.email,
    password: credentials.password,
  });
  if (data.access_token) {
    const userData = {
      role: data.role === "string" ? "Member" : data.role,
      country: (data.country === "string" || !data.country) ? "India" : data.country,
      region: (data.region === "string" || !data.region) ? "IN" : data.region,
      org_name: (data.company_name && data.company_name !== "string") ? data.company_name : ((data.org_name === "string" || !data.org_name) ? "Organization" : data.org_name),
      company_name: data.company_name,
      email: data.email || credentials.email,
      full_name: (data.full_name === "string" || !data.full_name) ? (data.email || credentials.email).split('@')[0] : (data.full_name || data.name || data.fullName || data.display_name),
      previous_session_logged_out: data.previous_session_logged_out,
      color_code: data.color_code,
      mfa: data.mfa || false,
      id: data.id,
      org_id: data.org_id,
    };

    if (data.mfa) {
      return { ...data, user: userData, requiresMfa: true };
    }

    setAccessToken(data.access_token);
    sessionStorage.setItem("jdforge_session", "1");
    return { ...data, user: userData };
  }
  return data;
};

export const signup = async (userData) => {
  return await apiPost("/auth/signup", {
    full_name: userData.full_name,
    email: userData.email,
    password: userData.password,
    confirm_password: userData.confirm_password,
    role: userData.role,
    company_name: userData.company_name
  });
};

export const logout = async () => {
  try {
    await apiPost("/auth/logout", {});
  } finally {
    sessionStorage.removeItem("jdforge_session");
    clearAccessToken();
    localStorage.removeItem("jdforge_token");
    localStorage.removeItem("jdforge_auth");
    localStorage.removeItem("jdforge_user");
  }
};

export const getMe = async () => {
    return await apiGet("/auth/me");
};

export const listMembers = async () => {
    return await apiGet("/jd/workflow/members");
};

export const deleteUser = async (email) => {
    return await apiDelete(`/auth/delete_user/${email}`);
};

/**
 * Token Management
 */

export const refreshToken = async () => {
    const data = await apiPost("/auth/refresh_token", {});
    if (data.access_token) {
        setAccessToken(data.access_token);
        console.log("[AuthService] Token refreshed successfully.");
    }
    return data;
};

export const getTokenInfo = async () => {
    return await apiGet("/auth/token_info");
};

/**
 * Password Recovery
 */

export const initiateForgotPassword = async (email) => {
    return await apiPost("/auth/forgot_password/initiate", { email, purpose: "forgot_password" });
};

export const verifyOTP = async (email, otp_code) => {
    return await apiPost("/auth/forgot_password/verify", { email, otp_code, purpose: "forgot_password" });
};

export const resetPassword = async (payload) => {
    return await apiPost("/auth/forgot_password/reset", { 
        email: payload.email,
        new_password: payload.new_password,
        confirm_password: payload.confirm_password,
        purpose: "forgot_password"
    });
};

export const updateUserProfile = async (userData) => {
    // userData: { user_id, full_name, email, password }
    return await apiPatch("/auth/update_user_profile", userData);
};

export const toggleUserMFA = async (email, mfa) => {
    return await apiPatch("/extra/user/mfa", { email, mfa });
};

export const initiateMFA = async (email) => {
    return await apiPost("/auth/forgot_password/initiate", { email, purpose: "mfa" });
};

export const verifyMFACode = async (email, otp_code) => {
    return await apiPost("/auth/forgot_password/verify", { email, otp_code, purpose: "mfa" });
};
