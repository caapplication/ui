import { getAuthHeaders, handleResponse } from './utils';

const API_BASE_URL = 'http://localhost:8001';

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

export const confirmPasswordReset = async (token, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'accept': 'application/json' },
        body: new URLSearchParams({ token, new_password: newPassword })
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
    formData.append('photo', file);
    const response = await fetch(`${API_BASE_URL}/profile/photo`, {
        method: 'PUT',
        headers: getAuthHeaders(token, null),
        body: formData
    });
    return handleResponse(response);
};
