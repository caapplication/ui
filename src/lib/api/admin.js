import { getAuthHeaders, handleResponse } from './utils';

const LOGIN_API_URL = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';

/**
 * Agencies Management
 */

export const listAgencies = async (token) => {
  const response = await fetch(`${LOGIN_API_URL}/agencies/`, {
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const createAgency = async (agencyData, token) => {
  const params = new URLSearchParams();
  params.append('name', agencyData.name);
  params.append('email', agencyData.email);

  const response = await fetch(`${LOGIN_API_URL}/agencies/`, {
    method: 'POST',
    headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
    body: params
  });
  return handleResponse(response);
};

export const deleteAgency = async (agencyId, token) => {
  const response = await fetch(`${LOGIN_API_URL}/agencies/${agencyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

/**
 * User Management
 */

export const listAllUsers = async (token) => {
  const response = await fetch(`${LOGIN_API_URL}/admin/users`, {
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const lockUser = async (userId, token) => {
  const response = await fetch(`${LOGIN_API_URL}/admin/users/${userId}/lock`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const unlockUser = async (userId, token) => {
  const response = await fetch(`${LOGIN_API_URL}/admin/users/${userId}/unlock`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const inviteCA = async (email, agencyId, token) => {
  const params = new URLSearchParams();
  params.append('email', email);
  params.append('agency_id', agencyId);

  const response = await fetch(`${LOGIN_API_URL}/invites/ca-accountant`, {
    method: 'POST',
    headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
    body: params
  });
  return handleResponse(response);
};

export const resendCAInvite = async (email, token) => {
  const params = new URLSearchParams();
  params.append('email', email);

  const response = await fetch(`${LOGIN_API_URL}/invites/ca-accountant/resend`, {
    method: 'POST',
    headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
    body: params
  });
  return handleResponse(response);
};
