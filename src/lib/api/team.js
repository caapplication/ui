import { handleResponse, getAuthHeaders } from './utils';

const API_BASE_URL = 'https://Login-api.fynivo.in';
const TASKS_API_BASE_URL = 'https://tasks-api.fynivo.in';

export const inviteTeamMember = async (email, caId, token) => {
    const response = await fetch(`${API_BASE_URL}/invites/ca-team-member`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams({ email, ca_id: caId }),
    });
    return handleResponse(response);
};

export const listTeamMembers = async (token) => {
    const response = await fetch(`${API_BASE_URL}/team/team-members`, {
        method: 'GET',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const updateTeamMember = async (memberId, data, token) => {
    const response = await fetch(`${API_BASE_URL}/team/team-member/${memberId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams(data),
    });
    return handleResponse(response);
};

export const deleteTeamMember = async (member, token) => {
    let url;
    const options = {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    };

    if (member.id) {
        url = `${API_BASE_URL}/team/team-member/${member.id}`;
    } else {
        url = `${API_BASE_URL}/invites/ca-team-member`;
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = new URLSearchParams({ email: member.email });
    }

    const response = await fetch(url, options);
    return handleResponse(response);
};

export const listDepartments = async (agencyId, token) => {
    const response = await fetch(`${TASKS_API_BASE_URL}/departments`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};
