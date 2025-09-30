import { getAuthHeaders, handleResponse } from './utils';

const TASK_API_BASE_URL = 'https://task-api.snolep.com';
const API_BASE_URL = 'http://127.0.0.1:8003';
const SERVICES_API_URL = 'http://127.0.0.1:8002';

export const createService = async (serviceData, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/services/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(serviceData)
    });
    return handleResponse(response);
};

export const listServices = async (agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/services/`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

export const getServiceDetails = async (serviceId, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/services/${serviceId}?_=${new Date().getTime()}`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

export const deleteService = async (serviceId, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/services/${serviceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token, '*/*', agencyId)
    });
    return handleResponse(response);
};

export const updateServiceSettings = async (serviceId, settingsData, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/settings/${serviceId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded', agencyId),
        body: new URLSearchParams(settingsData)
    });
    return handleResponse(response);
};

export const addChecklistItem = async (serviceId, checklistData, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/checklists/${serviceId}`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(checklistData)
    });
    return handleResponse(response);
};

export const getChecklist = async (serviceId, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/checklists/${serviceId}`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

export const deleteChecklistItem = async (checklistItemId, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/checklists/${checklistItemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token, '*/*', agencyId)
    });
    return handleResponse(response);
};

export const updateChecklistItem = async (checklistItemId, checklistData, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/checklists/${checklistItemId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(checklistData)
    });
    return handleResponse(response);
};

export const addSubtask = async (serviceId, subtaskData, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/subtasks/${serviceId}`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded', agencyId),
        body: new URLSearchParams(subtaskData)
    });
    return handleResponse(response);
};

export const getSubtasks = async (serviceId, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/subtasks/${serviceId}`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

export const deleteSubtask = async (subtaskId, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token, '*/*', agencyId)
    });
    return handleResponse(response);
};

export const addSupportingFile = async (serviceId, file, agencyId, token) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${SERVICES_API_URL}/options/supporting-files/${serviceId}`, {
        method: 'POST',
        headers: getAuthHeaders(token, null, agencyId),
        body: formData
    });
    return handleResponse(response);
};

export const getSupportingFiles = async (serviceId, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/supporting-files/${serviceId}`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

export const deleteSupportingFile = async (fileId, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/options/supporting-files/${fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token, '*/*', agencyId)
    });
    return handleResponse(response);
};

export const getClientCountForService = async (serviceId, agencyId, token) => {
    const response = await fetch(`${SERVICES_API_URL}/clients/${serviceId}/count`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};
