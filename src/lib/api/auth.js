import { getAuthHeaders, handleResponse } from './utils';

const API_BASE_URL = import.meta.env.VITE_LOGIN_API_URL || 'https://login-api.fynivo.in';

export const refreshToken = async (refreshToken) => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'accept': 'application/json'
        },
        body: new URLSearchParams({ refresh_token: refreshToken })
    });
    return handleResponse(response);
};

export const requestPasswordReset = async (email) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({ email })
    });
    return handleResponse(response);
};

export const confirmPasswordReset = async (token, newPassword, confirmPassword) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword, confirm_password: confirmPassword })
    });
    return handleResponse(response);
};

export const getProfile = async (token, agencyId) => {
  const response = await fetch(`${API_BASE_URL}/profile/`, {
    headers: getAuthHeaders(token, 'application/json', agencyId)
  });
  return handleResponse(response);
};

export const updateName = async (firstName, lastName, token) => {
  const response = await fetch(`${API_BASE_URL}/profile/name`, {
    method: 'PUT',
    headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
    body: new URLSearchParams({ first_name: firstName, last_name: lastName })
  });
  return handleResponse(response);
};

export const updatePassword = async (currentPassword, newPassword, confirmPassword, token) => {
    const response = await fetch(`${API_BASE_URL}/profile/password`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword })
    });
    return handleResponse(response);
};

export const toggle2FA = async (enable, token) => {
    const response = await fetch(`${API_BASE_URL}/profile/2fa`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams({ enable_2fa: enable })
    });
    return handleResponse(response);
};

export const verify2FA = async (otp, token) => {
    const response = await fetch(`${API_BASE_URL}/profile/2fa/verify`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams({ otp })
    });
    return handleResponse(response);
};

export const uploadProfilePicture = async (file, token) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/profile/photo`, {
        method: 'POST',
        headers: getAuthHeaders(token, null),
        body: formData
    });
    return handleResponse(response);
};

export const deleteProfilePicture = async (token) => {
    const response = await fetch(`${API_BASE_URL}/profile/photo`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
    });
    return handleResponse(response);
};

/**
 * Verify a token (e.g., email verification, invite, etc.)
 * @param {string} token
 * @returns {Promise<any>}
 */
export const verifyToken = async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
    });
    return handleResponse(response);
};

/**
 * Accept invitation or set password after token verification.
 * @param {string} token
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<any>}
 */
export const acceptInvitation = async (token, name, email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'accept': 'application/json'
        },
        body: new URLSearchParams({ name, email, password })
    });
    return handleResponse(response);
};
