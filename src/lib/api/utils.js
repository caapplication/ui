import { useAuth } from '@/hooks/useAuth';

export const BASE_URL = 'https://login-api.fynivo.in';

export const getAuthHeaders = (token, contentType = 'application/json', agencyId = null) => {
    const headers = {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    const finalAgencyId = agencyId || localStorage.getItem('agency_id');
    if (finalAgencyId) {
        headers['x-agency-id'] = finalAgencyId;
    }
    return headers;
};

export const handleResponse = async (response) => {
    const text = await response.text();
    if (!response.ok) {
        let error;
        try {
            error = JSON.parse(text);
        } catch (e) {
            error = { detail: text || `HTTP error! status: ${response.status}` };
        }
        
        const errorMessage = error.detail || `HTTP error! status: ${response.status}`;
        const messageString = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);

        if (response.status === 401 || messageString.toLowerCase().includes('invalid token') || messageString.toLowerCase().includes('token has expired')) {
             // We can't use useAuth here directly as it's not a component.
             // We'll throw a specific error and let a boundary or context handle it.
             // A simpler approach for now is to dispatch a custom event.
             window.dispatchEvent(new CustomEvent('auth-error'));
        }

        throw new Error(errorMessage);
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        return text; // In case of empty response body or non-json response
    }
};
