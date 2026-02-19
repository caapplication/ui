import { getAuthHeaders, handleResponse } from './utils';

const TASK_API_BASE_URL = import.meta.env.VITE_TASK_API_URL || 'http://127.0.0.1:8005';
const CLIENTS_API_BASE_URL = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';
const SERVICES_API_BASE_URL = import.meta.env.VITE_SERVICES_API_URL || 'http://127.0.0.1:8004';
const LOGIN_API_BASE_URL = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';

// Debug: Log API URLs (remove in production)
if (import.meta.env.DEV) {
    console.log('🔧 API URLs:', {
        CLIENT_API: CLIENTS_API_BASE_URL,
        LOGIN_API: LOGIN_API_BASE_URL,
        FINANCE_API: import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003',
        SERVICES_API: SERVICES_API_BASE_URL,
        TASK_API: TASK_API_BASE_URL
    });
}

export const listClients = async (agencyId, token) => {
    console.log('📡 Fetching clients from:', `${CLIENTS_API_BASE_URL}/clients/`);
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

export const listClientsByOrganization = async (organizationId, token) => {
    console.log('📡 Fetching clients by organization:', organizationId);
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/organization/${organizationId}`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json')
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

// ==================== Team Member Management ====================

export const getAllClientTeamMembers = async (agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/team-members/assignments`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

export const getClientTeamMembers = async (clientId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/team-members`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

export const assignTeamMembers = async (clientId, teamMemberIds, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/team-members`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify({ team_member_ids: teamMemberIds })
    });
    return handleResponse(response);
};

export const removeTeamMember = async (clientId, userId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/team-members/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

// ==================== Client Billing Invoices ====================

/**
 * Get billing invoices for a client from Client service
 */
export const getClientBillingInvoices = async (clientId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/client/${clientId}/invoices`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

/**
 * Get payment details for an invoice (CA bank details + client details) for Make Payment modal
 */
export const getInvoicePaymentDetails = async (invoiceId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${invoiceId}/payment-details`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

/**
 * Upload payment proof for a client billing invoice (client admin). Sets status to pending_verification.
 */
export const uploadClientInvoicePaymentProof = async (invoiceId, file, agencyId, token) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${invoiceId}/payment-proof`, {
        method: 'POST',
        headers: getAuthHeaders(token, null, agencyId),
        body: formData
    });
    return handleResponse(response);
};

/**
 * Get payment proof URL for an invoice (CA only - to view/download proof)
 */
export const getPaymentProofUrl = async (invoiceId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${invoiceId}/payment-proof-url`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

/**
 * Mark invoice as paid (CA only). Sets status to paid and paid_at.
 */
export const markInvoicePaid = async (invoiceId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${invoiceId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify({ status: 'paid' })
    });
    return handleResponse(response);
};

/**
 * Update invoice status (CA only). Use for rejected: { status: 'rejected' }.
 */
export const updateClientBillingInvoiceStatus = async (invoiceId, status, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${invoiceId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify({ status })
    });
    return handleResponse(response);
};

export const updateClientBillingInvoice = async (invoiceId, invoiceData, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${invoiceId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify(invoiceData)
    });
    return handleResponse(response);
};

// ==================== Client Company Profile ====================

/**
 * Get logged-in client admin's company details
 */
export const getMyCompany = async (token, clientId = null) => {
    let url = `${CLIENTS_API_BASE_URL}/clients/my-company`;
    if (clientId) {
        url += `?client_id=${clientId}`;
    }
    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json')
    });
    return handleResponse(response);
};

/**
 * Update logged-in client admin's company details
 */
export const updateMyCompany = async (companyData, token, clientId = null) => {
    let url = `${CLIENTS_API_BASE_URL}/clients/my-company`;
    if (clientId) {
        url += `?client_id=${clientId}`;
    }
    const response = await fetch(url, {
        method: 'PATCH',
        headers: getAuthHeaders(token, 'application/json'),
        body: JSON.stringify(companyData)
    });
    return handleResponse(response);
};

/**
 * Fetch invoice PDF as blob (for preview modal). Returns { blob, url } where url is object URL; caller must revoke it when done.
 */
export const getInvoicePDFBlob = async (invoiceId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${invoiceId}/download-pdf`, {
        method: 'GET',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });

    if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    // Get blob from response
    if (!response.ok) throw new Error(`Failed to load PDF: ${response.statusText}`);
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    return { blob, url };
};

/**
 * Download invoice PDF (triggers browser download)
 */
export const downloadInvoicePDF = async (invoiceId, agencyId, token) => {
    const { url } = await getInvoicePDFBlob(invoiceId, agencyId, token);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

// ==================== Client Lock/Unlock ====================

/**
 * Lock a client profile (CA only)
 */
export const lockClient = async (clientId, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/lock`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId)
    });
    return handleResponse(response);
};

/**
 * Unlock a client profile temporarily (CA only)
 */
export const unlockClient = async (clientId, unlockDays, agencyId, token) => {
    const response = await fetch(`${CLIENTS_API_BASE_URL}/clients/${clientId}/unlock`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json', agencyId),
        body: JSON.stringify({ unlock_days: unlockDays })
    });
    return handleResponse(response);
};
