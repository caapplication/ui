import { getAuthHeaders, handleResponse } from './utils';
import { encryptData } from './crypto';

const API_BASE_URL = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';

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
    const encryptedNewPassword = await encryptData(newPassword);
    const encryptedConfirmPassword = await encryptData(confirmPassword);
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({ token, new_password: encryptedNewPassword, confirm_password: encryptedConfirmPassword })
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
    const encryptedCurrent = await encryptData(currentPassword);
    const encryptedNew = await encryptData(newPassword);
    const encryptedConfirm = await encryptData(confirmPassword);

    const response = await fetch(`${API_BASE_URL}/profile/password`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams({
            current_password: encryptedCurrent,
            new_password: encryptedNew,
            confirm_password: encryptedConfirm
        })
    });
    return handleResponse(response);
};

export const toggle2FA = async (enable, token, password = null) => {
    const payload = { enable_2fa: enable };
    if (password) {
        payload.password = await encryptData(password);
    }

    const response = await fetch(`${API_BASE_URL}/profile/2fa`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/json'),
        body: JSON.stringify(payload)
    });
    return handleResponse(response);
};

export const verify2FA = async (otp, token) => {
    const encryptedOtp = await encryptData(otp);
    const response = await fetch(`${API_BASE_URL}/profile/2fa/verify`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams({ otp: encryptedOtp })
    });
    return handleResponse(response);
};

export const resend2FA = async (token) => {
    const response = await fetch(`${API_BASE_URL}/profile/2fa/resend`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json')
    });
    return handleResponse(response);
};

export const get2FAStatus = async (token) => {
    const response = await fetch(`${API_BASE_URL}/profile/2fa/status`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json')
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
 * @param {boolean} termsAccepted
 * @param {string} [clientIp] - optional; server also captures IP from request
 * @returns {Promise<any>}
 */
export const acceptInvitation = async (token, name, email, password, termsAccepted, clientIp = null) => {
    const encryptedPassword = await encryptData(password);
    const params = { token, name, email, password: encryptedPassword, terms_accepted: termsAccepted ? 'true' : 'false' };
    if (clientIp) params.client_ip = clientIp;
    const response = await fetch(`${API_BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'accept': 'application/json'
        },
        body: new URLSearchParams(params)
    });
    return handleResponse(response);
};
