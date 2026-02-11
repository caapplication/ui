import { useAuth } from '@/hooks/useAuth';

export const BASE_URL = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';

// Debug: Log API URLs in development
if (import.meta.env.DEV) {
    console.log('🔧 Login API URL:', BASE_URL);
}

export const getAuthHeaders = (token, contentType = 'application/json', agencyId = null) => {
    // Validate token before creating headers
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.error('Invalid token provided to getAuthHeaders:', token);
        throw new Error('Authentication token is missing or invalid. Please log in again.');
    }

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

        // Enhanced logging for 401 errors to help debug production issues
        if (response.status === 401) {
            console.error('🔴 401 Unauthorized Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorMessage,
                url: response.url,
                headers: Object.fromEntries(response.headers.entries())
            });
        }

        if (response.status === 401 || messageString.toLowerCase().includes('invalid token') || messageString.toLowerCase().includes('token has expired') || messageString.toLowerCase().includes('invalid authentication credentials')) {
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
