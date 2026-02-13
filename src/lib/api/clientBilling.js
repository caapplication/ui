import { getAuthHeaders, handleResponse } from './utils';

const CLIENT_API_BASE_URL = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';

export const getClientBillingSetup = async (clientId, agencyId, token) => {
    const response = await fetch(`${CLIENT_API_BASE_URL}/clients/${clientId}/billing`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    return handleResponse(response);
};

export const createOrUpdateClientBilling = async (clientId, billingData, agencyId, token) => {
    const response = await fetch(`${CLIENT_API_BASE_URL}/clients/${clientId}/billing`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(billingData),
    });
    return handleResponse(response);
};

export const updateClientBilling = async (clientId, billingData, agencyId, token) => {
    const response = await fetch(`${CLIENT_API_BASE_URL}/clients/${clientId}/billing`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(billingData),
    });
    return handleResponse(response);
};

export const bulkUpdateServiceBillings = async (clientId, serviceBillings, agencyId, token) => {
    const response = await fetch(`${CLIENT_API_BASE_URL}/clients/${clientId}/billing/services/bulk`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(serviceBillings),
    });
    return handleResponse(response);
};

export const generateInvoicesNow = async (clientId, agencyId, token) => {
    const response = await fetch(`${CLIENT_API_BASE_URL}/clients/${clientId}/billing/generate-invoices`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    return handleResponse(response);
};
