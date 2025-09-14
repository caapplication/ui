import { getAuthHeaders, handleResponse } from './utils';

const FINANCE_API_BASE_URL = 'https://finance-api.snolep.com';

export const getDocuments = async (entityId, token) => {
    let url = `${FINANCE_API_BASE_URL}/finance/documents/`;
    if (entityId) {
        url += `?entity_id=${entityId}`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const createFolder = async (folderName, entityId, parentId, token) => {
    let url = `${FINANCE_API_BASE_URL}/finance/documents/folder?folder_name=${encodeURIComponent(folderName)}&entity_id=${entityId}`;
    if (parentId && parentId !== 'root') {
        url += `&parent_id=${parentId}`;
    }
    const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const uploadFile = async (folderId, entityId, file, token) => {
    const formData = new FormData();
    formData.append('file', file);
    if (entityId) {
        formData.append('entity_id', entityId);
    }
    
    let url = `${FINANCE_API_BASE_URL}/finance/documents/`;
    if (folderId && folderId !== 'root') {
        url += `?folder_id=${folderId}`;
    }
    
    const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(token, null),
        body: formData,
    });
    return handleResponse(response);
};

export const deleteDocument = async (documentId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/finance/documents/${documentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const shareDocument = async (documentId, email, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/finance/documents/${documentId}/share?email=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const viewFile = async (documentId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/finance/documents/${documentId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'accept': '*/*'
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
};

export const getSharedDocuments = async (token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/finance/documents/share/`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};