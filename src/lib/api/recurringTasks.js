import { getAuthHeaders, handleResponse } from './utils';

const TASKS_API_BASE_URL = 'http://127.0.0.1:8005'; // Task service base URL

export const listRecurringTasks = async (agencyId, token, isActive = null) => {
    try {
        const params = new URLSearchParams();
        if (isActive !== null) {
            params.append('is_active', isActive);
        }
        const url = `${TASKS_API_BASE_URL}/recurring-tasks${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    } catch (error) {
        console.warn('Network or API error for listRecurringTasks:', error.message);
        return [];
    }
};

export const getRecurringTask = async (recurringTaskId, agencyId, token) => {
    try {
        const response = await fetch(`${TASKS_API_BASE_URL}/recurring-tasks/${recurringTaskId}`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    } catch (error) {
        console.warn('Network or API error for getRecurringTask:', error.message);
        throw error;
    }
};

export const createRecurringTask = async (recurringTaskData, agencyId, token) => {
    try {
        const response = await fetch(`${TASKS_API_BASE_URL}/recurring-tasks/`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(recurringTaskData),
        });
        return handleResponse(response);
    } catch (error) {
        console.warn('Network or API error for createRecurringTask:', error.message);
        throw error;
    }
};

export const updateRecurringTask = async (recurringTaskId, recurringTaskData, agencyId, token) => {
    try {
        const response = await fetch(`${TASKS_API_BASE_URL}/recurring-tasks/${recurringTaskId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(recurringTaskData),
        });
        return handleResponse(response);
    } catch (error) {
        console.warn('Network or API error for updateRecurringTask:', error.message);
        throw error;
    }
};

export const deleteRecurringTask = async (recurringTaskId, agencyId, token) => {
    try {
        const response = await fetch(`${TASKS_API_BASE_URL}/recurring-tasks/${recurringTaskId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId),
        });
        if (response.status === 204) {
            return { success: true };
        }
        return handleResponse(response);
    } catch (error) {
        console.warn('Network or API error for deleteRecurringTask:', error.message);
        throw error;
    }
};

export const triggerRecurringTaskScheduler = async (checkDate, agencyId, token) => {
    try {
        const params = checkDate ? `?check_date=${checkDate}` : '';
        const response = await fetch(`${TASKS_API_BASE_URL}/scheduler/create-recurring-tasks${params}`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    } catch (error) {
        console.warn('Network or API error for triggerRecurringTaskScheduler:', error.message);
        throw error;
    }
};

