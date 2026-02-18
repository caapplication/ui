import { handleResponse, getAuthHeaders } from './utils';


const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003';


export const listTemplates = async (token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/folder-templates/`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const createTemplate = async (templateData, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/folder-templates/`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(templateData),
  });
  return handleResponse(response);
};

export const updateTemplate = async (templateId, templateData, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/folder-templates/${templateId}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(templateData),
  });
  return handleResponse(response);
};

export const deleteTemplate = async (templateId, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/folder-templates/${templateId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const applyTemplate = async (templateId, clientIds, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/folder-templates/${templateId}/apply`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ client_ids: clientIds }),
  });
  return handleResponse(response);
};
