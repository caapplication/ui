import { getAuthHeaders, handleResponse, BASE_URL } from './utils';

const API_BASE_URL = BASE_URL;
const CLIENT_API_BASE_URL = 'https://client-api.fynivo.in';

export const listOrganisations = async (token) => {
    const response = await fetch(`${API_BASE_URL}/organizations/`, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    return handleResponse(response);
};

export const createOrganisation = async (data, token) => {
    const response = await fetch(`${API_BASE_URL}/organizations/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams(data)
    });
    return handleResponse(response);
};

export const updateOrganisation = async (orgId, data, token) => {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams(data)
    });
    return handleResponse(response);
};

export const deleteOrganisation = async (orgId, token) => {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
    });
    if (response.status === 204 || response.status === 200) {
        return { success: true };
    }
    return handleResponse(response);
};

export const listEntities = async (organization_id, token) => {
    let url = `${API_BASE_URL}/entities/?organization_id=${organization_id}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    return handleResponse(response);
};

export const createEntity = async (data, token) => {
    const response = await fetch(`${API_BASE_URL}/entities/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams(data)
    });
    return handleResponse(response);
};

export const updateEntity = async (entityId, data, token) => {
    const response = await fetch(`${API_BASE_URL}/entities/${entityId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams(data)
    });
    return handleResponse(response);
};

export const deleteEntity = async (entityId, token) => {
    const response = await fetch(`${API_BASE_URL}/entities/${entityId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
    });
    if (response.status === 204 || response.status === 200) {
        return { success: true };
    }
    return handleResponse(response);
};

export const listOrgUsers = async (orgId, token) => {
    const response = await fetch(`${API_BASE_URL}/invites/organization/${orgId}/users`, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    return handleResponse(response);
};

export const resendToken = async (email) => {
    const response = await fetch(`${API_BASE_URL}/admin/resend-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'accept': 'application/json'
        },
        body: new URLSearchParams({ email })
    });
    return handleResponse(response);
};

export const inviteOrganizationUser = async (orgId, email, token) => {
    const url = `${API_BASE_URL}/invites/organization-user`;
    const headers = {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    const body = new URLSearchParams({
        email,
        org_id: orgId
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
    });

    return handleResponse(response);
};

export const deleteOrgUser = async (orgId, userId, token) => {
    const response = await fetch(`${API_BASE_URL}/invites/organization/${orgId}/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
    });
    if (response.status === 204 || response.status === 200) {
        return { success: true };
    }
    return handleResponse(response);
};

export const listAllEntities = async (token) => {
    let url = `${API_BASE_URL}/entities/`;
    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    return handleResponse(response);
};
