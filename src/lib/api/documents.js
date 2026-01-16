import { getAuthHeaders, handleResponse } from './utils';

export const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003';

export const getDocuments = async (entityId, token) => {
    // For non-CA accountants, entityId is required
    // This check prevents the API call if entityId is missing
    // Note: We allow null/undefined for CA_ACCOUNTANT role (handled by backend)

    let url = `${FINANCE_API_BASE_URL}/api/documents/folders/`;
    const params = new URLSearchParams();
    if (entityId) {
        params.append('entity_id', entityId);
    }
    params.append('exclude_shared', 'true');
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });

    // Handle 400 error specifically for missing entity_id
    if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.detail && errorData.detail.includes('Entity ID is required')) {
            throw new Error('Entity ID is required. Please select an entity first.');
        }
    }

    return handleResponse(response);
};

export const createFolder = async (folderName, entityId, parentId, agencyId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/folders/`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ name: folderName, entity_id: entityId, parent_id: parentId === 'root' ? null : parentId, agency_id: agencyId }),
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

export const deleteDocument = async (itemId, itemType, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/${itemId}?item_type=${itemType}`, {
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

export const getSharedDocuments = async (token, userRole, entityId) => {
    let url = `${FINANCE_API_BASE_URL}/api/documents/shared`;
    if (userRole === 'CA_ACCOUNTANT') {
        url = `${FINANCE_API_BASE_URL}/api/ca/documents/shared/`;
    }
    if (entityId) {
        url += `?entity_id=${entityId}`;
    } else if (userRole !== 'CA_ACCOUNTANT') {
        throw new Error("Entity ID is required for this user role.");
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

export const createPublicShareTokenDocument = async (documentId, expiresInDays = 30, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/${documentId}/public-share?expires_in_days=${expiresInDays}`, {
        method: 'POST',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const createPublicShareTokenFolder = async (folderId, expiresInDays = 30, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/folders/${folderId}/public-share?expires_in_days=${expiresInDays}`, {
        method: 'POST',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const revokePublicShareTokenDocument = async (documentId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/${documentId}/public-share`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const revokePublicShareTokenFolder = async (folderId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/folders/${folderId}/public-share`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getPublicFolder = async (token) => {
    try {
        const url = `${FINANCE_API_BASE_URL}/api/public/documents/folders/${token}`;
        console.log('Fetching public folder from:', url);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            },
        });
        console.log('Response status:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to load folder: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Folder data:', data);
        return data;
    } catch (error) {
        console.error('Error in getPublicFolder:', error);
        throw error;
    }
};

export const getPublicSubfolder = async (parentToken, subfolderId) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/public/documents/folders/${parentToken}/subfolders/${subfolderId}`, {
        method: 'GET',
        headers: {
            'accept': 'application/json'
        },
    });
    return handleResponse(response);
};

export const viewPublicDocument = async (token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/public/documents/documents/${token}`, {
        method: 'GET',
        headers: {
            'accept': '*/*'
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
};

export const listExpiringDocuments = async (token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/documents/expiring`, {
        method: 'GET',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};