import { useAuth } from '@/hooks/useAuth';

export const BASE_URL = 'http://127.0.0.1:8001'; // Use local service for development

export const getAuthHeaders = (token, contentType = 'application/json', agencyId = null) => {
    const headers = {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    
    let finalAgencyId = agencyId;

    if (!finalAgencyId) {
        try {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                finalAgencyId = parsedUser.agency_id;
            }
        } catch (error) {
            console.error("Failed to parse user data from localStorage", error);
        }
    }

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
             window.dispatchEvent(new CustomEvent('auth-error'));
        }

        throw new Error(errorMessage);
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
};
