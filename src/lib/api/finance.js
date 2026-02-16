import { getAuthHeaders, handleResponse } from './utils';
import { getCachedAttachment, setCachedAttachment } from '../cache';

const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003';

// CA Company Profile APIs
export const getCACompanyProfile = async (token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca/company-profile`, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    // Handle 404 gracefully - profile doesn't exist yet
    if (response.status === 404) {
        throw { response: { status: 404 } };
    }
    return handleResponse(response);
};

export const createCACompanyProfile = async (formData, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca/company-profile`, {
        method: 'POST',
        headers: getAuthHeaders(token, null), // Let browser set Content-Type with boundary for FormData
        body: formData
    });
    return handleResponse(response);
};

export const updateCACompanyProfile = async (formData, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca/company-profile`, {
        method: 'PUT',
        headers: getAuthHeaders(token, null), // Let browser set Content-Type with boundary for FormData
        body: formData
    });
    return handleResponse(response);
};

export const getEntities = async (token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/entities`, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });
    if (response.status === 404) return [];
    return handleResponse(response).catch(err => {
        console.error('Failed to fetch entities:', err);
        return [];
    });
};

export const getDashboardData = async (entityId, token, agencyId, fromDate = null, toDate = null, limit = 10) => {
    let url = `${FINANCE_API_BASE_URL}/api/dashboard/?entity_id=${entityId}&limit=${limit}`;
    if (fromDate) url += `&from_date=${fromDate}`;
    if (toDate) url += `&to_date=${toDate}`;

    const response = await fetch(url, {
        headers: getAuthHeaders(token, 'application/json', agencyId),
    });
    return handleResponse(response);
};

export const getBeneficiaries = async (organizationId, token, skip = 0, limit = 100) => {
    const userRole = JSON.parse(atob(token.split('.')[1])).role;
    let url = `${FINANCE_API_BASE_URL}/api/beneficiaries/?skip=${skip}&limit=${limit}`;
    if (userRole !== 'CLIENT_USER' && organizationId) {
        url += `&organization_id=${organizationId}`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getBeneficiariesForCA = async (organizationId, token, skip = 0, limit = 100) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/?organization_id=${organizationId}&skip=${skip}&limit=${limit}`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const addBeneficiary = async (beneficiaryData, token) => {
    const { organisation_id, ...rest } = beneficiaryData;
    const bodyParams = new URLSearchParams(rest);
    if (organisation_id) {
        bodyParams.append('organization_id', organisation_id);
    }
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: bodyParams,
    });
    return handleResponse(response);
};

export const deleteBeneficiary = async (beneficiaryId, organizationId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}?organization_id=${organizationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getBeneficiary = async (beneficiaryId, organizationId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}?organization_id=${organizationId}`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const updateBeneficiary = async (beneficiaryId, organizationId, beneficiaryData, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}?organization_id=${organizationId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/json'),
        body: JSON.stringify(beneficiaryData),
    });
    return handleResponse(response);
};

export const getBankAccountsForBeneficiary = async (beneficiaryId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}/bank_accounts`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

// Optimized version for voucher form dropdowns - faster, returns only essential fields
export const getBankAccountsForBeneficiaryDropdown = async (beneficiaryId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}/bank_accounts/dropdown`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const addBankAccount = async (beneficiaryId, bankAccountData, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}/bank_accounts`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/json'),
        body: JSON.stringify(bankAccountData),
    });
    return handleResponse(response);
};

export const deactivateBankAccount = async (beneficiaryId, bankAccountId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}/bank_accounts/${bankAccountId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/json'),
        body: JSON.stringify({ is_active: false }),
    });
    return handleResponse(response);
};

export const reactivateBankAccount = async (beneficiaryId, bankAccountId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}/bank_accounts/${bankAccountId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(token, 'application/json'),
        body: JSON.stringify({ is_active: true }),
    });
    return handleResponse(response);
};

// Permanent delete (allowed only for inactive accounts on API)
export const deleteBankAccount = async (beneficiaryId, bankAccountId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}/bank_accounts/${bankAccountId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getOrganisationBankAccounts = async (entityId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/bank_accounts/?entity_id=${entityId}&masked=false`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

// Optimized version for voucher form dropdowns - faster, returns only essential fields
export const getOrganisationBankAccountsDropdown = async (entityId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/bank_accounts/dropdown?entity_id=${entityId}`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getOrganisationBankAccountsForCA = async (entityId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/bank_accounts/?entity_id=${entityId}&masked=false`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const addOrganisationBankAccount = async (data, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/bank_accounts/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams(data),
    });
    return handleResponse(response);
};

export const deleteOrganisationBankAccount = async (bankAccountId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/bank_accounts/${bankAccountId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const updateOrganisationBankAccount = async (bankAccountId, data, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/bank_accounts/${bankAccountId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const getInvoicesList = async (entityId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/list?entity_id=${entityId}`, {
        headers: getAuthHeaders(token),
    });
    const invoices = await handleResponse(response);
    return Array.isArray(invoices) ? invoices : [];
};

export const getInvoices = async (entityId, token) => {
    let url = `${FINANCE_API_BASE_URL}/api/invoices/`;
    if (entityId) {
        url += `?entity_id=${entityId}`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    const invoices = await handleResponse(response);

    return Array.isArray(invoices) ? invoices : [];
};

export const addInvoice = async (invoiceFormData, token) => {
    const headers = getAuthHeaders(token);
    delete headers['Content-Type'];
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/`, {
        method: 'POST',
        headers,
        body: invoiceFormData,
    });
    return handleResponse(response);
};

export const updateInvoice = async (invoiceId, entityId, invoiceFormData, token) => {
    const isFormData = invoiceFormData instanceof FormData;
    let url = `${FINANCE_API_BASE_URL}/api/invoices/${invoiceId}`;
    if (entityId) {
        url += `?entity_id=${entityId}`;
    }

    const response = await fetch(url, {
        method: 'PATCH',
        headers: getAuthHeaders(token, isFormData ? null : 'application/json'),
        body: isFormData ? invoiceFormData : JSON.stringify(invoiceFormData),
    });
    return handleResponse(response);
};

export const deleteInvoice = async (entityId, invoiceId, token) => {
    let url = `${FINANCE_API_BASE_URL}/api/invoices/${invoiceId}`;
    if (entityId) {
        url += `?entity_id=${entityId}`;
    }
    const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getInvoiceAttachment = async (attachmentId, token) => {
    try {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/attachments/${attachmentId}`, {
            headers: getAuthHeaders(token),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Invoice attachment fetch failed:', response.status, errorText);
            throw new Error(`Failed to fetch attachment: ${response.status} ${errorText}`);
        }

        // Check if response has content
        const contentType = response.headers.get('content-type') || response.headers.get('Content-Type');
        const contentLength = response.headers.get('content-length');
        console.log('Invoice attachment response:', { contentType, contentLength, status: response.status, attachmentId });

        let blob = await response.blob();

        if (blob.size === 0) {
            console.error('Received empty blob for invoice attachment:', attachmentId);
            throw new Error('Received empty attachment');
        }

        // Use blob.type if content-type header is not available
        const finalContentType = contentType || blob.type || 'application/pdf';
        console.log('Invoice attachment blob created successfully:', blob.size, 'bytes, type:', finalContentType);

        // Ensure blob has correct MIME type for PDFs (important for iframe rendering)
        if (finalContentType.toLowerCase().includes('pdf') && blob.type !== finalContentType) {
            blob = new Blob([blob], { type: finalContentType });
        }

        // Return both URL and content type
        return {
            url: URL.createObjectURL(blob),
            contentType: finalContentType
        };
    } catch (error) {
        console.error('Error in getInvoiceAttachment:', error);
        throw error;
    }
};


export const getVouchersList = async (entityId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/list?entity_id=${entityId}`, {
        headers: getAuthHeaders(token),
    });
    const vouchers = await handleResponse(response);
    return Array.isArray(vouchers) ? vouchers : [];
};

export const getVouchers = async (entityId, token) => {
    let url = `${FINANCE_API_BASE_URL}/api/vouchers/`;
    if (entityId) {
        url += `?entity_id=${entityId}`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    const vouchers = await handleResponse(response);
    return Array.isArray(vouchers) ? vouchers : [];
};

export const addVoucher = async (voucherFormData, token) => {
    const headers = getAuthHeaders(token);
    delete headers['Content-Type'];
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/`, {
        method: 'POST',
        headers,
        body: voucherFormData,
    });
    return handleResponse(response);
};

export const updateVoucher = async (voucherId, voucherData, token) => {
    const isFormData = voucherData instanceof FormData;
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/${voucherId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token, isFormData ? null : 'application/json'),
        body: isFormData ? voucherData : JSON.stringify(voucherData),
    });
    return handleResponse(response);
};

export const deleteVoucher = async (entityId, voucherId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/${voucherId}?entity_id=${entityId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

// CA-specific voucher endpoints (no entity_id required)
export const getCAVoucher = async (voucherId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca_team/vouchers/${voucherId}`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const updateCAVoucher = async (voucherId, voucherData, token) => {
    const isFormData = voucherData instanceof FormData;
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca_team/vouchers/${voucherId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token, isFormData ? null : 'application/json'),
        body: isFormData ? voucherData : JSON.stringify(voucherData),
    });
    return handleResponse(response);
};

export const deleteCAVoucher = async (voucherId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca_team/vouchers/${voucherId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getVoucherQuick = async (entityId, voucherId, token) => {
    const userRole = JSON.parse(atob(token.split('.')[1])).role;
    let url = `${FINANCE_API_BASE_URL}/api/vouchers/${voucherId}/quick`;
    if (entityId) {
        url += `?entity_id=${entityId}`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getVoucher = async (entityId, voucherId, token) => {
    const userRole = JSON.parse(atob(token.split('.')[1])).role;
    let url = `${FINANCE_API_BASE_URL}/api/vouchers/${voucherId}`;
    if (entityId) {
        url += `?entity_id=${entityId}`;
    } else if (userRole === 'CA_ACCOUNTANT' || userRole === 'CA_TEAM') {
        url = `${FINANCE_API_BASE_URL}/api/ca_team/vouchers/${voucherId}`;
    }
    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getVoucherAttachment = async (attachmentId, token, entityId = null) => {
    const CACHE_KEY = `attachment_${attachmentId}`;
    try {
        // Check cache first
        const cached = await getCachedAttachment(CACHE_KEY);
        if (cached) {
            console.log('Serving attachment from IDB cache:', attachmentId);
            return {
                url: URL.createObjectURL(cached.blob),
                contentType: cached.contentType
            };
        }

        // Use the regular attachment endpoint for all users (CA and non-CA)
        // The backend handles authorization based on the token
        let url = `${FINANCE_API_BASE_URL}/api/attachments/${attachmentId}`;

        // Add entity_id as query param if provided (for filtering/authorization)
        if (entityId) {
            url += `?entity_id=${entityId}`;
        }

        const response = await fetch(url, {
            headers: getAuthHeaders(token),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Attachment fetch failed:', response.status, errorText, 'URL:', url);
            throw new Error(`Failed to fetch attachment: ${response.status} ${errorText}`);
        }

        // Check if response has content
        const contentType = response.headers.get('content-type') || response.headers.get('Content-Type');
        const contentLength = response.headers.get('content-length');
        console.log('Attachment response:', { contentType, contentLength, status: response.status });

        let blob = await response.blob();

        if (blob.size === 0) {
            console.error('Received empty blob for attachment:', attachmentId);
            throw new Error('Received empty attachment');
        }

        // Use blob.type if content-type header is not available
        const finalContentType = contentType || blob.type || 'application/pdf';
        console.log('Blob created successfully:', blob.size, 'bytes, type:', finalContentType);

        // Ensure blob has correct MIME type for PDFs (important for iframe rendering)
        if (finalContentType.toLowerCase().includes('pdf') && blob.type !== finalContentType) {
            blob = new Blob([blob], { type: finalContentType });
        }

        // Cache the blob
        await setCachedAttachment(CACHE_KEY, { blob, contentType: finalContentType });

        // Return both URL and content type
        return {
            url: URL.createObjectURL(blob),
            contentType: finalContentType
        };
    } catch (error) {
        console.error('Error in getVoucherAttachment:', error);
        throw error;
    }
};

export const getVoucherPdf = async (voucherId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/${voucherId}/generate_pdf`, {
        headers: getAuthHeaders(token),
    });
    if (!response.ok) {
        throw new Error('Failed to fetch voucher PDF');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const getCATeamVouchers = async (entityId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/all?entity_id=${entityId}`, {
        headers: getAuthHeaders(token),
    });
    const vouchers = await handleResponse(response);
    return Array.isArray(vouchers) ? vouchers : [];
};

export const getCATeamVouchersBulk = async (entityIds, token) => {
    // Bulk endpoint - accepts comma-separated entity IDs for MUCH faster performance
    const entityIdsStr = Array.isArray(entityIds) ? entityIds.join(',') : entityIds;
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/bulk?entity_ids=${entityIdsStr}`, {
        headers: getAuthHeaders(token),
    });
    const vouchers = await handleResponse(response);
    return Array.isArray(vouchers) ? vouchers : [];
};

export const getCATeamInvoiceAttachment = async (invoiceId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/${invoiceId}/attachment`, {
        headers: getAuthHeaders(token),
    });
    if (!response.ok) {
        throw new Error('Failed to fetch attachment');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const getCATeamInvoices = async (entityId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/all?entity_id=${entityId}`, {
        headers: getAuthHeaders(token),
    });
    const invoices = await handleResponse(response);
    return Array.isArray(invoices) ? invoices : [];
};

export const getCATeamInvoicesBulk = async (entityIds, token) => {
    // Bulk endpoint - accepts comma-separated entity IDs for MUCH faster performance
    const entityIdsStr = Array.isArray(entityIds) ? entityIds.join(',') : entityIds;
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/bulk?entity_ids=${entityIdsStr}`, {
        headers: getAuthHeaders(token),
    });
    const invoices = await handleResponse(response);
    return Array.isArray(invoices) ? invoices : [];
};

export const exportVouchersToTallyXML = async (entityId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca_team/vouchers/export_tally?entity_id=${entityId}`, {
        headers: getAuthHeaders(token),
    });
    if (!response.ok) {
        throw new Error('Failed to export vouchers to Tally XML');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers_tally_export_${entityId}.xml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};

export const exportVouchers = async (entityId, token, fromDate, toDate, entityName) => {
    let url = `${FINANCE_API_BASE_URL}/api/vouchers/export?entity_id=${entityId}`;
    if (fromDate) url += `&from_date=${fromDate}`;
    if (toDate) url += `&to_date=${toDate}`;

    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to export vouchers');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;

    // Use entity name for filename if available, otherwise fallback to default or backend header
    let filename = entityName ? `${entityName} - Vouchers.xlsx` : `Vouchers_Export_${entityId}.xlsx`;

    // Only check content disposition if we don't have an entity name (or maybe just ignore backend filename to enforce user preference?)
    // User explicitly asked for "entity name and invoice or voucher", so we prioritize that.
    if (!entityName) {
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
};

export const exportInvoices = async (entityId, token, fromDate, toDate, entityName) => {
    let url = `${FINANCE_API_BASE_URL}/api/invoices/export?entity_id=${entityId}`;
    if (fromDate) url += `&from_date=${fromDate}`;
    if (toDate) url += `&to_date=${toDate}`;

    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to export invoices');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;

    // Use entity name for filename if available
    let filename = entityName ? `${entityName} - Invoices.xlsx` : `Invoices_Export_${entityId}.xlsx`;

    if (!entityName) {
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
};

export const getActivityLog = async (itemId, itemType, token, startDate = null, endDate = null) => {
    // Call the real backend API for activity logs (plural endpoint)
    let url = `${FINANCE_API_BASE_URL}/api/activity_logs/${itemType}/${itemId}`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const createActivityLog = async (data, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/activity_logs/`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(token),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const getClientDocumentActivityLogs = async (clientId, token, startDate = null, endDate = null) => {
    let url = `${FINANCE_API_BASE_URL}/api/activity_logs/client/${clientId}/documents`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

export const getAccountantDashboardStats = async (token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/dashboard/`, {
        headers: getAuthHeaders(token),
    });
    return handleResponse(response);
};

/** Lightweight indicator for sidebar: true if any voucher/invoice has status pending_ca_approval (CA only). */
export const getFinancePendingCaApprovalIndicator = async (token) => {
    try {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/dashboard/pending-ca-approval`, {
            headers: getAuthHeaders(token),
        });
        const data = await handleResponse(response);
        return data?.has_pending === true;
    } catch (error) {
        return false;
    }
};

/** Lightweight indicator for sidebar: true if any voucher/invoice has status pending_master_admin_approval (CLIENT_MASTER_ADMIN only). */
export const getFinancePendingMasterAdminApprovalIndicator = async (token) => {
    try {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/dashboard/pending-master-admin-approval`, {
            headers: getAuthHeaders(token),
        });
        const data = await handleResponse(response);
        return data?.has_pending === true;
    } catch (error) {
        return false;
    }
};

/** Get per-entity indicators (finance pending, notices unread) for entity dropdowns. */
export const getEntityIndicators = async (token) => {
    try {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/dashboard/entity-indicators`, {
            headers: getAuthHeaders(token),
        });
        const data = await handleResponse(response);
        return data || {}; // { "entity_id": { "has_finance_pending": bool, "has_notice_unread": bool } }
    } catch (error) {
        console.error('Failed to fetch entity indicators:', error);
        return {};
    }
};

export const getNoticeAttachment = async (noticeId, token) => {
    // Similar logic to getVoucherAttachment but for Notices
    // No caching implemented yet for simplicity, but can add if needed
    try {
        let url = `${FINANCE_API_BASE_URL}/api/notices/${noticeId}/attachment`;

        const response = await fetch(url, {
            headers: getAuthHeaders(token),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Notice attachment fetch failed:', response.status, errorText, 'URL:', url);
            throw new Error(`Failed to fetch attachment: ${response.status} ${errorText}`);
        }

        // Check if response has content
        const contentType = response.headers.get('content-type') || response.headers.get('Content-Type');

        let blob = await response.blob();

        if (blob.size === 0) {
            console.error('Received empty blob for notice attachment:', noticeId);
            throw new Error('Received empty attachment');
        }

        // Use blob.type if content-type header is not available
        const finalContentType = contentType || blob.type || 'application/pdf';

        // Ensure blob has correct MIME type for PDFs (important for iframe rendering)
        if (finalContentType.toLowerCase().includes('pdf') && blob.type !== finalContentType) {
            blob = new Blob([blob], { type: finalContentType });
        }

        // Return both URL and content type
        return {
            url: URL.createObjectURL(blob),
            contentType: finalContentType
        };
    } catch (error) {
        console.error('Error in getNoticeAttachment:', error);
        throw error;
    }
};

export const getInvoicePdf = async (invoiceId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/${invoiceId}/generate_pdf`, {
        headers: getAuthHeaders(token),
    });
    if (!response.ok) {
        throw new Error('Failed to fetch invoice PDF');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};
