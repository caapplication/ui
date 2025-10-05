
import { getAuthHeaders, handleResponse } from './utils';

const CLIENTS_API_BASE_URL = 'http://localhost:8003';
const FINANCE_API_BASE_URL = 'https://finance-api.fynivo.in/';

export const getGeneralSettings = async (agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/general`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    return handleResponse(response);
};

export const updateGeneralSettings = async (settingId, data, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/general/${settingId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const getTags = async (agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/tags`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    return handleResponse(response);
};

export const createTag = async (tagData, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/tags`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(tagData),
    });
    return handleResponse(response);
};

export const updateTag = async (tagId, tagData, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/tags/${tagId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(tagData),
    });
    return handleResponse(response);
};

export const deleteTag = async (tagId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/tags/${tagId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    if (response.ok) {
        return { success: true };
    }
    return handleResponse(response);
};

export const getPortals = async (agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/portals/`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    return handleResponse(response);
};

export const createPortal = async (portalData, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/portals/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(portalData),
    });
    return handleResponse(response);
};

export const deletePortal = async (portalId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/portals/${portalId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token, null, agencyId),
    });
    if (response.status === 204 || response.ok) {
        return { success: true };
    }
    return handleResponse(response);
};

export const getBusinessTypes = async (agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/business-types`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    return handleResponse(response);
};

export const createBusinessType = async (data, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/business-types`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const updateBusinessType = async (id, data, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/business-types/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const deleteBusinessType = async (id, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/settings/business-types/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    if (response.ok) {
        return { success: true };
    }
    return handleResponse(response);
};

export const getFinanceHeaders = async (agencyId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/finance-headers/`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    return handleResponse(response);
};

export const createFinanceHeader = async (data, agencyId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/finance-headers/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const updateFinanceHeader = async (id, data, agencyId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/finance-headers/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const deleteFinanceHeader = async (id, agencyId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/finance-headers/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    if (response.ok) {
        return { success: true };
    }
    return handleResponse(response);
};
