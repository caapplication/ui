
import { getAuthHeaders, handleResponse } from './utils';

    const FINANCE_API_BASE_URL = 'https://finance-api.snolep.com';

    export const getEntities = async (token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/entities/`, {
          method: 'GET',
          headers: getAuthHeaders(token)
      });
      if (response.status === 404) return [];
      return handleResponse(response).catch(err => {
          console.error('Failed to fetch entities:', err);
          return [];
      });
    };

    export const getDashboardData = async (entityId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/dashboard/?entity_id=${entityId}`, {
            headers: getAuthHeaders(token),
        });
        return handleResponse(response);
    };

    export const getBeneficiaries = async (token, page = 1) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/?page=${page}`, {
            headers: getAuthHeaders(token),
        });
        return handleResponse(response);
    };

    export const addBeneficiary = async (beneficiaryData, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams(beneficiaryData),
      });
      return handleResponse(response);
    };

    export const deleteBeneficiary = async (beneficiaryId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      return handleResponse(response);
    };

    export const getBeneficiary = async (beneficiaryId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}`, {
        headers: getAuthHeaders(token),
      });
      return handleResponse(response);
    };

    export const updateBeneficiary = async (beneficiaryId, beneficiaryData, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
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

    export const addBankAccount = async (beneficiaryId, bankAccountData, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/beneficiaries/${beneficiaryId}/bank_accounts`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(bankAccountData),
      });
      return handleResponse(response);
    };

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

    export const getInvoices = async (entityId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/?entity_id=${entityId}`, {
            headers: getAuthHeaders(token),
        });
        const invoices = await handleResponse(response);

        return Array.isArray(invoices) ? invoices : [];
    };

    export const addInvoice = async (invoiceFormData, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/`, {
        method: 'POST',
        headers: getAuthHeaders(token, null),
        body: invoiceFormData,
      });
      return handleResponse(response);
    };

    export const updateInvoice = async (invoiceId, invoiceFormData, token) => {
      const isFormData = invoiceFormData instanceof FormData;
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/${invoiceId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(token, isFormData ? null : 'application/json'),
        body: isFormData ? invoiceFormData : JSON.stringify(invoiceFormData),
      });
      return handleResponse(response);
    };

    export const deleteInvoice = async (entityId, invoiceId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/invoices/${invoiceId}?entity_id=${entityId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      return handleResponse(response);
    };

    export const getInvoiceAttachment = async (attachmentId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/attachments/${attachmentId}`, {
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch attachment');
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    };


    export const getVouchers = async (entityId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/?entity_id=${entityId}`, {
        headers: getAuthHeaders(token),
      });
      const vouchers = await handleResponse(response);
      return Array.isArray(vouchers) ? vouchers : [];
    };

    export const addVoucher = async (voucherFormData, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/`, {
        method: 'POST',
        headers: getAuthHeaders(token, null),
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

    export const getVoucher = async (entityId, voucherId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/vouchers/${voucherId}?entity_id=${entityId}`, {
            headers: getAuthHeaders(token),
        });
        return handleResponse(response);
    };

    export const getVoucherAttachment = async (attachmentId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/attachments/${attachmentId}`, {
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch attachment');
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
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
        return handleResponse(response);
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

    export const getActivityLog = async (itemId, itemType, token) => {
        console.log(`Fetching activity log for ${itemType} ${itemId} with token ${token}`);
        // This is a mock implementation
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    { id: 1, user: 'Admin User', action: 'Created', timestamp: '2023-10-27T10:00:00Z' },
                    { id: 2, user: 'Client User', action: 'Viewed', timestamp: '2023-10-27T11:30:00Z' },
                    { id: 3, user: 'Admin User', action: 'Edited Amount', timestamp: '2023-10-28T14:20:00Z' },
                ]);
            }, 500);
        });
    };
