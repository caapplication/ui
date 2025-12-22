import { handleResponse, getAuthHeaders } from './utils';

const API_BASE_URL = import.meta.env.VITE_LOGIN_API_URL || 'https://login-api.fynivo.in';
const TASKS_API_BASE_URL = import.meta.env.VITE_TASK_API_URL || 'https://task-api.fynivo.in';

export const inviteTeamMember = async (email, caId, token) => {
    const response = await fetch(`${API_BASE_URL}/invites/ca-team-member`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams({ email, ca_id: caId }),
    });
    return handleResponse(response);
};

export const listTeamMembers = async (token, status = '') => {
    let url = `${API_BASE_URL}/team/team-members`;
    if (status) {
        url += `?status=${status}`;
    }
    const response = await fetch(url, {
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
        url = `${API_BASE_URL}/invites/ca-team-member?email=${encodeURIComponent(member.email)}`;
    }

    const response = await fetch(url, options);
    return handleResponse(response);
};

export const resendInvite = async (email, token) => {
    const response = await fetch(`${API_BASE_URL}/team/team-member/resend-invite`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams({ email }),
    });
    return handleResponse(response);
};

export const listDepartments = async (agencyId, token) => {
    const response = await fetch(`${TASKS_API_BASE_URL}/departments`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};
