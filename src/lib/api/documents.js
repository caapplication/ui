import { getAuthHeaders, handleResponse } from './utils';

const FINANCE_API_BASE_URL = 'https://finance-api.snolep.com';

export const getDocuments = async (entityId, token) => {
    let url = `${FINANCE_API_BASE_URL}/api/documents/folders/?exclude_shared=true`;
    if (entityId) {
        url += `?entity_id=${entityId}`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const createFolder = async (folderName, entityId, parentId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/folders/`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ name: folderName, entity_id: entityId, parent_id: parentId === 'root' ? null : parentId }),
    });
    return handleResponse(response);
};

export const uploadFile = async (folderId, entityId, file, expiryDate, token) => {
    const formData = new FormData();
    formData.append('file', file);
    if (entityId) {
        formData.append('entity_id', entityId);
    }
    if (folderId && folderId !== 'root') {
        formData.append('folder_id', folderId);
    }
    if (expiryDate) {
        const formattedDate = expiryDate.toISOString().split('T')[0];
        formData.append('expiry_date', formattedDate);
    }
    
    const url = `${FINANCE_API_BASE_URL}/api/documents/`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(token, null),
        body: formData,
    });
    return handleResponse(response);
};

export const deleteDocument = async (documentId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const shareDocument = async (documentId, emails, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ emails }),
    });
    return handleResponse(response);
};

export const viewFile = async (documentId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/${documentId}`, {
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

export const getSharedDocuments = async (token, userRole) => {
    let url = `${FINANCE_API_BASE_URL}/api/documents/share`;
    if (userRole === 'CA_ACCOUNTANT') {
        url = `${FINANCE_API_BASE_URL}/api/ca/documents/shared/`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const shareFolder = async (folderId, email, token) => {
    const formData = new FormData();
    formData.append('email', email);

    const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca/documents/folders/${folderId}/share`, {
        method: 'POST',
        headers: getAuthHeaders(token, null),
        body: formData,
    });
    return handleResponse(response);
};

export const createCAFolder = async (folderName, parentId, token) => {
    const formData = new FormData();
    formData.append('folder_name', folderName);
    if (parentId && parentId !== 'root') {
        formData.append('parent_id', parentId);
    }
    
    const url = `${FINANCE_API_BASE_URL}/api/ca/documents/folders/`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(token, null),
        body: formData,
    });
    return handleResponse(response);
};

export const uploadCAFile = async (folderId, file, expiryDate, token) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId && folderId !== 'root') {
        formData.append('folder_id', folderId);
    }
    if (expiryDate) {
        const formattedDate = expiryDate.toISOString().split('T')[0];
        formData.append('expiry_date', formattedDate);
    }
    
    const url = `${FINANCE_API_BASE_URL}/api/ca/documents/`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(token, null),
        body: formData,
    });
    return handleResponse(response);
};
