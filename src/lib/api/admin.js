import { getAuthHeaders, handleResponse } from './utils';

const LOGIN_API_URL = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';
const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003';

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

export const getAgencyDetails = async (agencyId, token) => {
  const response = await fetch(`${LOGIN_API_URL}/agencies/${agencyId}/details`, {
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

/**
 * Billing & Subscriptions Management
 */
export const getAdminModules = async (token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/admin/subscriptions/modules`, {
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const updateAdminModule = async (moduleId, data, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/admin/subscriptions/modules/${moduleId}`, {
    method: 'PUT',
    headers: getAuthHeaders(token, 'application/json'),
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

export const getAdminInvoices = async (params, token) => {
  const searchParams = new URLSearchParams();
  if (params.agency_id) searchParams.append('agency_id', params.agency_id);
  if (params.status) searchParams.append('status', params.status);
  searchParams.append('limit', params.limit || 50);
  searchParams.append('offset', params.offset || 0);
  
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/admin/invoices?${searchParams.toString()}`, {
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const markInvoicePaid = async (invoiceId, paymentMethod, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/admin/invoices/${invoiceId}/mark-paid?payment_method=${paymentMethod}`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const generateMonthlyInvoices = async (month, token) => {
  const url = month 
    ? `${FINANCE_API_BASE_URL}/api/admin/invoices/generate?billing_month=${month}`
    : `${FINANCE_API_BASE_URL}/api/admin/invoices/generate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const getAgencyBillingDetails = async (agencyId, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/admin/agencies/${agencyId}/billing`, {
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};

export const toggleAgencyModule = async (agencyId, params, token) => {
  const searchParams = new URLSearchParams();
  searchParams.append('module_id', params.module_id);
  if (params.entity_id) searchParams.append('entity_id', params.entity_id);
  
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/admin/agencies/${agencyId}/subscriptions/toggle?${searchParams.toString()}`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  return handleResponse(response);
};
