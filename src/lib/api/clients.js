import { getAuthHeaders, handleResponse } from './utils';
    
    const TASK_API_BASE_URL = 'https://task-api.fynivo.in'; // Use local service for development
    const CLIENTS_API_BASE_URL = 'https://client-api.fynivo.in'; // Use local service for development
    const SERVICES_API_BASE_URL = 'https://services-api.fynivo.in'; // Use local service for development
    const LOGIN_API_BASE_URL = 'https://login-api.fynivo.in'; // Use local service for development
    
export const listClients = async (agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};
    
    export const createClient = async (clientData, agencyId, token) => {
        const formData = new FormData();
        
        // Debug: Log the incoming data
        console.log('createClient - clientData:', clientData);
        
        // Add all fields to FormData - explicitly handle each field to ensure proper formatting
        // Required fields - always include if present
        if (clientData.is_active !== undefined) {
            formData.append('is_active', clientData.is_active.toString());
        }
        // name is required - always include if it exists in clientData
        if (clientData.name !== undefined && clientData.name !== null) {
            formData.append('name', String(clientData.name));
        } else {
            console.warn('createClient - name is missing from clientData');
        }
        // client_type is required - always include if it exists in clientData
        if (clientData.client_type !== undefined && clientData.client_type !== null && clientData.client_type !== '') {
            formData.append('client_type', String(clientData.client_type));
        } else {
            console.warn('createClient - client_type is missing or empty from clientData');
        }
        if (clientData.organization_id !== undefined && clientData.organization_id !== null && clientData.organization_id !== '') {
            formData.append('organization_id', clientData.organization_id);
        }
        if (clientData.pan !== undefined && clientData.pan !== null && clientData.pan !== '') {
            formData.append('pan', clientData.pan);
        }
        if (clientData.gstin !== undefined && clientData.gstin !== null && clientData.gstin !== '') {
            formData.append('gstin', clientData.gstin);
        }
        if (clientData.contact_person_name !== undefined && clientData.contact_person_name !== null && clientData.contact_person_name !== '') {
            formData.append('contact_person_name', clientData.contact_person_name);
        }
        if (clientData.date_of_birth !== undefined && clientData.date_of_birth !== null && clientData.date_of_birth !== '') {
            formData.append('date_of_birth', clientData.date_of_birth);
        }
        if (clientData.user_ids !== undefined && Array.isArray(clientData.user_ids)) {
            clientData.user_ids.forEach(id => {
                formData.append('user_ids', id);
            });
        }
        if (clientData.tag_ids !== undefined && Array.isArray(clientData.tag_ids)) {
            clientData.tag_ids.forEach(id => {
                formData.append('tag_ids', id);
            });
        }
        if (clientData.mobile !== undefined && clientData.mobile !== null && clientData.mobile !== '') {
            formData.append('mobile', clientData.mobile);
        }
        if (clientData.secondary_phone !== undefined && clientData.secondary_phone !== null && clientData.secondary_phone !== '') {
            formData.append('secondary_phone', clientData.secondary_phone);
        }
        if (clientData.email !== undefined && clientData.email !== null && clientData.email !== '') {
            formData.append('email', clientData.email);
        }
        if (clientData.address_line1 !== undefined && clientData.address_line1 !== null && clientData.address_line1 !== '') {
            formData.append('address_line1', clientData.address_line1);
        }
        if (clientData.address_line2 !== undefined && clientData.address_line2 !== null && clientData.address_line2 !== '') {
            formData.append('address_line2', clientData.address_line2);
        }
        if (clientData.city !== undefined && clientData.city !== null && clientData.city !== '') {
            formData.append('city', clientData.city);
        }
        if (clientData.postal_code !== undefined && clientData.postal_code !== null && clientData.postal_code !== '') {
            formData.append('postal_code', clientData.postal_code);
        }
        if (clientData.state !== undefined && clientData.state !== null && clientData.state !== '') {
            formData.append('state', clientData.state);
        }
        if (clientData.opening_balance_date !== undefined && clientData.opening_balance_date !== null && clientData.opening_balance_date !== '') {
            formData.append('opening_balance_date', clientData.opening_balance_date);
        }
        if (clientData.opening_balance_amount !== undefined && clientData.opening_balance_amount !== null) {
            formData.append('opening_balance_amount', clientData.opening_balance_amount.toString());
        }
        if (clientData.opening_balance_type !== undefined && clientData.opening_balance_type !== null && clientData.opening_balance_type !== '') {
            formData.append('opening_balance_type', clientData.opening_balance_type);
        }
        if (clientData.assigned_ca_user_id !== undefined && clientData.assigned_ca_user_id !== null && clientData.assigned_ca_user_id !== '') {
            formData.append('assigned_ca_user_id', clientData.assigned_ca_user_id);
        }
        
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/`, {
            method: 'POST',
            headers: getAuthHeaders(token, null, agencyId), // null for Content-Type to let browser set it with boundary
            body: formData
        });
        return handleResponse(response);
    };
    
    export const updateClient = async (clientId, clientData, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(clientData)
        });
        return handleResponse(response);
    };
    
    export const uploadClientPhoto = async (clientId, photoFile, agencyId, token) => {
        const formData = new FormData();
        formData.append('file', photoFile);
    
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/photo`, {
            method: 'POST',
            headers: getAuthHeaders(token, null, agencyId),
            body: formData
        });
        const result = await handleResponse(response);
        // Return proxy URL instead of direct S3 URL
        if (result.photo_url) {
            // Replace S3 URL with proxy endpoint URL
            const objectName = result.photo_url.split('.s3.amazonaws.com/')[-1];
            result.photo_url = `${CLIENTS_API_BASE_URL}/clients/${clientId}/photo`;
        }
        return result;
    };
    
    export const getClientPhotoUrl = (clientId, photoUrl, agencyId, token) => {
        // If photo_url is an S3 URL, use proxy endpoint instead
        if (photoUrl && photoUrl.includes('.s3.amazonaws.com/')) {
            return `${CLIENTS_API_BASE_URL}/clients/${clientId}/photo`;
        }
        return photoUrl;
    };
    
    export const deleteClientPhoto = async (clientId, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/photo`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId)
        });
        return handleResponse(response);
    };
    
    export const deleteClient = async (clientId, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId)
        });
        if (response.status === 204) {
            return { success: true };
        }
        return handleResponse(response);
    };
    
    
    export const listClientPortals = async (clientId, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/portals`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId)
        });
        return handleResponse(response);
    };
    
    export const createClientPortal = async (clientId, portalData, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/portals`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(portalData)
        });
        return handleResponse(response);
    };
    
    export const updateClientPortal = async (clientId, portalId, portalData, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/portals/${portalId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(portalData)
        });
        return handleResponse(response);
    }
    
    export const revealClientPortalSecret = async (clientId, portalId, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/portals/${portalId}/reveal`, {
            method: 'POST',
            headers: getAuthHeaders(token, null, agencyId)
        });
        return handleResponse(response);
    };
    
    export const deleteClientPortal = async (clientId, portalId, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/portals/${portalId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId)
        });
        if (response.status === 204) {
            return { success: true };
        }
        return handleResponse(response);
    };
    
    export const inviteOrganizationUser = async (orgId, email, agencyId, token) => {
        const url = `${LOGIN_API_BASE_URL}/invites/organization-user`;
        
        const headers = {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        };
    
        const body = new URLSearchParams({
            email: email,
            org_id: orgId
        });
    
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body,
        });
    
        return handleResponse(response);
    };
    
    export const listClientServices = async (clientId, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/services/${clientId}/services`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId)
        });
        return handleResponse(response);
    };
    
    export const addServicesToClient = async (clientId, serviceIds, agencyId, token) => {
        const payload = serviceIds.map(id => ({ service_id: id }));
        const response = await fetch(`${CLIENTS_API_BASE_URL}/services/${clientId}/services`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(payload)
        });
        return handleResponse(response);
    };
    
    export const removeServicesFromClient = async (clientId, serviceIds, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/services/${clientId}/services`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify({ service_ids: serviceIds })
        });
        return handleResponse(response);
    };
    
    export const getClientDashboard = async (clientId, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/dashboard`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId)
        });
        return handleResponse(response);
    };
