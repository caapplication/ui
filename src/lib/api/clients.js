import { getAuthHeaders, handleResponse } from './utils';
    
    const TASK_API_BASE_URL = 'https://task-api.fynivo.in';
    const CLIENTS_API_BASE_URL = 'http://localhost:8003';
    const SERVICES_API_BASE_URL = 'https://services-api.fynivo.in';
    const LOGIN_API_BASE_URL = 'http://localhost:8002';
    
    export const listClients = async (agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId)
        });
        return handleResponse(response);
    };
    
    export const createClient = async (clientData, agencyId, token) => {
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(clientData)
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
        formData.append('photo', photoFile);
    
        const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/photo`, {
            method: 'POST',
            headers: getAuthHeaders(token, null, agencyId),
            body: formData
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
        const response = await fetch(`${SERVICES_API_BASE_URL}/services/${clientId}/services`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId)
        });
        return handleResponse(response);
    };
    
    export const addServicesToClient = async (clientId, serviceIds, agencyId, token) => {
        const payload = serviceIds.map(id => ({ service_id: id }));
        const response = await fetch(`${SERVICES_API_BASE_URL}/services/${clientId}/services`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(payload)
        });
        return handleResponse(response);
    };
    
    export const removeServicesFromClient = async (clientId, serviceIds, agencyId, token) => {
        const response = await fetch(`${SERVICES_API_BASE_URL}/services/${clientId}/services`, {
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