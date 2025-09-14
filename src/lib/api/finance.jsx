import { getAuthHeaders, handleResponse } from './utils';
import { viewFile } from './documents';

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

    if (!Array.isArray(invoices)) {
        return [];
    }

    const invoicesWithUrls = await Promise.all(
        invoices.map(async (invoice) => {
            if (invoice.attachment_id) {
                try {
                    const file = await viewFile(invoice.attachment_id, token);
                    return { ...invoice, attachment_url: file.file_url };
                } catch (error) {
                    console.error(`Failed to get attachment URL for invoice ${invoice.id}:`, error);
                    return { ...invoice, attachment_url: null };
                }
            }
            return invoice;
        })
    );

    return invoicesWithUrls;
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

  if (!Array.isArray(vouchers)) {
    return [];
  }

  const vouchersWithUrls = await Promise.all(
    vouchers.map(async (voucher) => {
        if (voucher.attachment_id) {
            try {
                const file = await viewFile(voucher.attachment_id, token);
                return { ...voucher, attachment_url: file.file_url };
            } catch (error) {
                console.error(`Failed to get attachment URL for voucher ${voucher.id}:`, error);
                return { ...voucher, attachment_url: null };
            }
        }
        return voucher;
    })
  );

  return vouchersWithUrls;
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

  if (!Array.isArray(vouchers)) {
    return [];
  }

  const vouchersWithUrls = await Promise.all(
    vouchers.map(async (voucher) => {
      if (voucher.attachment_id) {
        try {
          const file = await viewFile(voucher.attachment_id, token);
          return { ...voucher, attachment_url: file.file_url };
        } catch (error) {
          console.error(`Failed to get attachment URL for voucher ${voucher.id}:`, error);
          return { ...voucher, attachment_url: null };
        }
      }
      return voucher;
    })
  );

  return vouchersWithUrls;
};

export const getCATeamInvoices = async (entityId, token) => {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/ca_team/invoices?entity_id=${entityId}`, {
      headers: getAuthHeaders(token),
    });
    const invoices = await handleResponse(response);
    
    if (!Array.isArray(invoices)) {
        return [];
    }

    const invoicesWithUrls = await Promise.all(
        invoices.map(async (invoice) => {
            if (invoice.attachment_id) {
                try {
                    const file = await viewFile(invoice.attachment_id, token);
                    return { ...invoice, attachment_url: file.file_url };
                } catch (error) {
                    console.error(`Failed to get attachment URL for invoice ${invoice.id}:`, error);
                    return { ...invoice, attachment_url: null };
                }
            }
            return invoice;
        })
    );

    return invoicesWithUrls;
};

export const exportVouchersToTallyXML = (vouchers, companyName = 'Company Name') => {
  const toTallyDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const escapeXML = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const xmlContent = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        ${vouchers.map(voucher => `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Payment" ACTION="Create">
            <DATE>${toTallyDate(voucher.created_date)}</DATE>
            <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXML(voucher.id.slice(0, 10))}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${escapeXML(voucher.beneficiaryName)}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXML(voucher.beneficiaryName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${voucher.amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${voucher.payment_type === 'cash' ? 'Cash' : 'Bank'}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${voucher.amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <NARRATION>${escapeXML(voucher.remarks || '')}</NARRATION>
          </VOUCHER>
        </TALLYMESSAGE>`).join('')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  const blob = new Blob([xmlContent.trim()], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vouchers_tally.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
