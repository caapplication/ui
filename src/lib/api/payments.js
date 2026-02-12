import api from '../api';

const BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://localhost:8001';

/**
 * Get invoices with payment status for an entity (client)
 */
export const getInvoicesWithPaymentStatus = async (entityId, token) => {
  const response = await fetch(`${BASE_URL}/api/payments/entity/${entityId}/invoices`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch invoices' }));
    throw new Error(error.detail || 'Failed to fetch invoices');
  }

  return response.json();
};

/**
 * Get payment QR code image and bank details for an invoice (from CA uploaded settings)
 */
export const getPaymentQRCode = async (invoiceId, token) => {
  const response = await fetch(`${BASE_URL}/api/payments/invoice/${invoiceId}/qr-code`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch QR code' }));
    throw new Error(error.detail || 'Failed to fetch QR code');
  }

  return response.json();
};

/**
 * Upload payment proof (screenshot/PDF)
 */
export const uploadPaymentProof = async (invoiceId, file, transactionId, paymentMethod, remarks, token) => {
  const formData = new FormData();
  formData.append('file', file);
  if (transactionId) formData.append('transaction_id', transactionId);
  if (paymentMethod) formData.append('payment_method', paymentMethod);
  if (remarks) formData.append('remarks', remarks);

  const response = await fetch(`${BASE_URL}/api/payments/invoice/${invoiceId}/payment-proof`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to upload payment proof' }));
    throw new Error(error.detail || 'Failed to upload payment proof');
  }

  return response.json();
};

/**
 * Get payment QR settings for CA
 */
export const getPaymentQRSettings = async (entityId, token) => {
  const url = entityId 
    ? `${BASE_URL}/api/payments/qr-settings?entity_id=${entityId}`
    : `${BASE_URL}/api/payments/qr-settings`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch QR settings' }));
    throw new Error(error.detail || 'Failed to fetch QR settings');
  }

  return response.json();
};

/**
 * Create/Update payment QR settings (CA uploads QR code image)
 */
export const createPaymentQRSettings = async (qrCodeImageId, bankDetails, entityId, token) => {
  const formData = new FormData();
  formData.append('qr_code_image_id', qrCodeImageId);
  if (entityId) formData.append('entity_id', entityId);
  if (bankDetails.bank_name) formData.append('bank_name', bankDetails.bank_name);
  if (bankDetails.account_number) formData.append('account_number', bankDetails.account_number);
  if (bankDetails.ifsc_code) formData.append('ifsc_code', bankDetails.ifsc_code);
  if (bankDetails.branch_name) formData.append('branch_name', bankDetails.branch_name);
  if (bankDetails.account_holder_name) formData.append('account_holder_name', bankDetails.account_holder_name);
  if (bankDetails.upi_id) formData.append('upi_id', bankDetails.upi_id);

  const response = await fetch(`${BASE_URL}/api/payments/qr-settings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to save QR settings' }));
    throw new Error(error.detail || 'Failed to save QR settings');
  }

  return response.json();
};

/**
 * Update payment QR settings
 */
export const updatePaymentQRSettings = async (settingsId, qrCodeImageId, bankDetails, isActive, token) => {
  const formData = new FormData();
  if (qrCodeImageId !== undefined) formData.append('qr_code_image_id', qrCodeImageId);
  if (bankDetails?.bank_name !== undefined) formData.append('bank_name', bankDetails.bank_name || '');
  if (bankDetails?.account_number !== undefined) formData.append('account_number', bankDetails.account_number || '');
  if (bankDetails?.ifsc_code !== undefined) formData.append('ifsc_code', bankDetails.ifsc_code || '');
  if (bankDetails?.branch_name !== undefined) formData.append('branch_name', bankDetails.branch_name || '');
  if (bankDetails?.account_holder_name !== undefined) formData.append('account_holder_name', bankDetails.account_holder_name || '');
  if (bankDetails?.upi_id !== undefined) formData.append('upi_id', bankDetails.upi_id || '');
  if (isActive !== undefined) formData.append('is_active', isActive);

  const response = await fetch(`${BASE_URL}/api/payments/qr-settings/${settingsId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update QR settings' }));
    throw new Error(error.detail || 'Failed to update QR settings');
  }

  return response.json();
};
