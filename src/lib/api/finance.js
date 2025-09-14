
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

    export const getBeneficiaries = async (token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/finance/beneficiaries/`, {
            headers: getAuthHeaders(token),
        });
        return handleResponse(response);
    };

    export const addBeneficiary = async (beneficiaryData, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/finance/beneficiaries/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams(beneficiaryData),
      });
      return handleResponse(response);
    };

    export const deleteBeneficiary = async (beneficiaryId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/finance/beneficiaries/${beneficiaryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      return handleResponse(response);
    };

    export const getBankAccountsForBeneficiary = async (beneficiaryId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/finance/beneficiaries/${beneficiaryId}/bank_accounts`, {
        headers: getAuthHeaders(token),
      });
      return handleResponse(response);
    };

    export const addBankAccount = async (beneficiaryId, bankAccountData, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/finance/beneficiaries/${beneficiaryId}/bank_accounts`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(bankAccountData),
      });
      return handleResponse(response);
    };

    export const deleteBankAccount = async (beneficiaryId, bankAccountId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/finance/beneficiaries/${beneficiaryId}/bank_accounts/${bankAccountId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      return handleResponse(response);
    };

    export const getOrganisationBankAccounts = async (entityId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/finance/bank_accounts/?entity_id=${entityId}`, {
            headers: getAuthHeaders(token),
        });
        return handleResponse(response);
    };

    export const addOrganisationBankAccount = async (data, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/finance/bank_accounts/`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
            body: new URLSearchParams(data),
        });
        return handleResponse(response);
    };

    export const deleteOrganisationBankAccount = async (bankAccountId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/finance/bank_accounts/${bankAccountId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token),
        });
        return handleResponse(response);
    };

    export const getInvoices = async (entityId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/finance/invoices/?entity_id=${entityId}`, {
            headers: getAuthHeaders(token),
        });
        const invoices = await handleResponse(response);

        return Array.isArray(invoices) ? invoices : [];
    };

    export const addInvoice = async (invoiceFormData, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/finance/invoices/`, {
        method: 'POST',
        headers: getAuthHeaders(token, null),
        body: invoiceFormData,
      });
      return handleResponse(response);
    };

    export const deleteInvoice = async (entityId, invoiceId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/finance/invoices/${invoiceId}?entity_id=${entityId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      return handleResponse(response);
    };

    export const getInvoiceAttachment = async (attachmentId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/finance/attachments/${attachmentId}`, {
            headers: getAuthHeaders(token),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch attachment');
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    };


    export const getVouchers = async (entityId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/finance/vouchers/?entity_id=${entityId}`, {
        headers: getAuthHeaders(token),
      });
      const vouchers = await handleResponse(response);
      return Array.isArray(vouchers) ? vouchers : [];
    };

    export const addVoucher = async (voucherData, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/finance/vouchers/`, {
        method: 'POST',
        headers: getAuthHeaders(token, 'application/x-www-form-urlencoded'),
        body: new URLSearchParams(voucherData),
      });
      return handleResponse(response);
    };

    export const deleteVoucher = async (entityId, voucherId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/finance/vouchers/${voucherId}?entity_id=${entityId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token),
        });
        return handleResponse(response);
    };

    export const getCATeamVouchers = async (entityId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca_team/vouchers?entity_id=${entityId}`, {
        headers: getAuthHeaders(token),
      });
      const vouchers = await handleResponse(response);
      return Array.isArray(vouchers) ? vouchers : [];
    };

    export const getCATeamInvoiceAttachment = async (invoiceId, token) => {
      const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca_team/invoices/${invoiceId}/attachment`, {
        headers: getAuthHeaders(token),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch attachment');
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    };

    export const getCATeamInvoices = async (entityId, token) => {
        const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca_team/invoices?entity_id=${entityId}`, {
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
  