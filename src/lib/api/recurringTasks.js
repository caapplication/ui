import { getAuthHeaders, handleResponse } from './utils';

const TASKS_API_BASE_URL = import.meta.env.VITE_TASK_API_URL || 'http://127.0.0.1:8005';

export const listRecurringTasks = async (agencyId, token, isActive = null, page = 1, limit = 10, serviceId = null, assignedTo = null) => {
    try {
        const params = new URLSearchParams();
        params.append('is_recurring', 'true');  // Filter for recurring task templates
        
        if (isActive !== null && isActive !== undefined) {
            params.append('recurrence_is_active', String(isActive)); // Convert boolean to string
        }
        if (serviceId) {
            params.append('service_id', String(serviceId));
        }
        if (assignedTo) {
            params.append('assigned_to', String(assignedTo));
        }

        // Backend expects 'skip' and 'limit'
        // Convert page/limit to skip/limit
        const skip = (page - 1) * limit;
        params.append('skip', String(skip));
        params.append('limit', String(limit));

        // Use unified tasks API
        const url = `${TASKS_API_BASE_URL}/tasks/?${params.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        const data = await handleResponse(response);
        
        // Transform to match expected format (items array with pagination)
        if (Array.isArray(data)) {
            return {
                items: data,
                total: data.length,
                page: page,
                size: limit,
                pages: Math.ceil(data.length / limit)
            };
        }
        
        return data;
    } catch (error) {
        console.error('Network or API error for listRecurringTasks:', error);
        throw error; // Re-throw to let the component handle it
    }
};

export const getRecurringTask = async (recurringTaskId, agencyId, token) => {
    try {
        // Use unified tasks API - recurring tasks are just tasks with is_recurring=true
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${recurringTaskId}`, {
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
        // Ensure is_recurring is set to true and map fields
        const taskData = {
            ...recurringTaskData,
            is_recurring: true
        };
        
        // Map recurring task fields to task fields
        if (taskData.frequency !== undefined) {
            taskData.recurrence_frequency = taskData.frequency;
            delete taskData.frequency;
        }
        if (taskData.interval !== undefined) {
            taskData.recurrence_interval = taskData.interval;
            delete taskData.interval;
        }
        if (taskData.start_date !== undefined) {
            taskData.recurrence_start_date = taskData.start_date;
            delete taskData.start_date;
        }
        if (taskData.end_date !== undefined) {
            taskData.recurrence_end_date = taskData.end_date;
            delete taskData.end_date;
        }
        if (taskData.day_of_week !== undefined) {
            taskData.recurrence_day_of_week = taskData.day_of_week;
            delete taskData.day_of_week;
        }
        if (taskData.day_of_month !== undefined) {
            taskData.recurrence_day_of_month = taskData.day_of_month;
            delete taskData.day_of_month;
        }
        if (taskData.week_of_month !== undefined) {
            taskData.recurrence_week_of_month = taskData.week_of_month;
            delete taskData.week_of_month;
        }
        if (taskData.is_active !== undefined) {
            taskData.recurrence_is_active = taskData.is_active;
            delete taskData.is_active;
        }
        
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(taskData),
        });
        return handleResponse(response);
    } catch (error) {
        console.warn('Network or API error for createRecurringTask:', error.message);
        throw error;
    }
};

export const updateRecurringTask = async (recurringTaskId, recurringTaskData, agencyId, token) => {
    try {
        // Ensure is_recurring stays true and map fields
        const taskData = {
            ...recurringTaskData,
            is_recurring: true
        };
        
        // Map recurring task fields to task fields
        if (taskData.frequency !== undefined) {
            taskData.recurrence_frequency = taskData.frequency;
            delete taskData.frequency;
        }
        if (taskData.interval !== undefined) {
            taskData.recurrence_interval = taskData.interval;
            delete taskData.interval;
        }
        if (taskData.start_date !== undefined) {
            taskData.recurrence_start_date = taskData.start_date;
            delete taskData.start_date;
        }
        if (taskData.end_date !== undefined) {
            taskData.recurrence_end_date = taskData.end_date;
            delete taskData.end_date;
        }
        if (taskData.day_of_week !== undefined) {
            taskData.recurrence_day_of_week = taskData.day_of_week;
            delete taskData.day_of_week;
        }
        if (taskData.day_of_month !== undefined) {
            taskData.recurrence_day_of_month = taskData.day_of_month;
            delete taskData.day_of_month;
        }
        if (taskData.week_of_month !== undefined) {
            taskData.recurrence_week_of_month = taskData.week_of_month;
            delete taskData.week_of_month;
        }
        if (taskData.is_active !== undefined) {
            taskData.recurrence_is_active = taskData.is_active;
            delete taskData.is_active;
        }
        
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${recurringTaskId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(taskData),
        });
        return handleResponse(response);
    } catch (error) {
        console.warn('Network or API error for updateRecurringTask:', error.message);
        throw error;
    }
};

export const deleteRecurringTask = async (recurringTaskId, agencyId, token) => {
    try {
        // Use unified tasks API
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${recurringTaskId}`, {
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

