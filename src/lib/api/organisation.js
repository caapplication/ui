import { getAuthHeaders, handleResponse, BASE_URL } from './utils';

const API_BASE_URL = BASE_URL;
const CLIENT_API_BASE_URL = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';

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
    let url = `${API_BASE_URL}/entities/`;
    if (organization_id) {
        url += `?organization_id=${organization_id}`;
    }
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

export const inviteOrganizationUser = async (orgId, email, agencyId, token) => {
    const url = `${API_BASE_URL}/invites/organization-user`;
    const headers = {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    const body = new URLSearchParams({
        email,
        org_id: orgId,
        agency_id: agencyId
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
    });

    return handleResponse(response);
};

export const inviteEntityUser = async (entityId, email, token, role = null, departmentId = null) => {
    const url = `${API_BASE_URL}/invites/entity-user`;
    const headers = {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    const params = {
        email,
        entity_id: entityId
    };
    if (role) {
        params.role = role;
    }
    if (departmentId) {
        params.department_id = departmentId;
    }

    const body = new URLSearchParams(params);

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
    });

    return handleResponse(response);
};

export const listEntityUsers = async (entityId, token) => {
    const response = await fetch(`${API_BASE_URL}/entities/${entityId}/users`, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    return handleResponse(response);
};

export const deleteEntityUser = async (entityId, userId, token) => {
    const response = await fetch(`${API_BASE_URL}/entities/${entityId}/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
    });
    if (response.status === 204 || response.status === 200) {
        return { success: true };
    }
    return handleResponse(response);
};

export const deleteOrgUser = async (orgId, userId, token) => {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/users/${userId}`, {
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

export const deleteCaTeamMember = async (email, token) => {
    const response = await fetch(`${API_BASE_URL}/invites/ca-team-member?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (response.status === 204 || response.status === 200) {
        return { success: true };
    }
    return handleResponse(response);
};

export const deleteInvitedOrgUser = async (email, token) => {
    const response = await fetch(`${API_BASE_URL}/invites/organization-user?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
    });
    if (response.status === 204 || response.status === 200) {
        return { success: true };
    }
    return handleResponse(response);
};

// Invite CA Team Member (matches curl format)
export const inviteCaTeamMember = async (email, ca_id, token) => {
    const response = await fetch(`${API_BASE_URL}/invites/ca-team-member`, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ email, ca_id })
    });
    return handleResponse(response);
};

export const listAllEntityUsers = async (orgId, token) => {
    const response = await fetch(`${API_BASE_URL}/entities/org/${orgId}/users`, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    return handleResponse(response);
    return handleResponse(response);
};

export const listAllAccessibleEntityUsers = async (token) => {
    const response = await fetch(`${API_BASE_URL}/entities/all-entity-users`, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    return handleResponse(response);
};

export const addEntityUsers = async (entityId, userIds, token) => {
    const response = await fetch(`${API_BASE_URL}/entities/${entityId}/users/batch-add`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json'),
        body: JSON.stringify({ user_ids: userIds })
    });
    return handleResponse(response);
};

export const listAllClientUsers = async (token, entityId = null) => {
    let url = `${API_BASE_URL}/entities/all-client-users`;
    if (entityId) {
        url += `?entity_id=${entityId}`;
    }
    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    return handleResponse(response);
};
