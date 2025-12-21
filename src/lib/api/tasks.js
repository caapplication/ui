import { getAuthHeaders, handleResponse } from './utils';

    const TASKS_API_BASE_URL = 'https://task-api.fynivo.in'; // Use local service for development

    export const listTasks = async (agencyId, token) => {
        try {
            const response = await fetch(`${TASKS_API_BASE_URL}/tasks/`, {
                method: 'GET',
                headers: getAuthHeaders(token, 'application/json', agencyId),
            });
            return handleResponse(response);
        } catch (error) {
            // Handle network errors (service not running, CORS, etc.)
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
                console.warn('Task service not available at', TASKS_API_BASE_URL, '- returning empty array');
                return { items: [] }; // Return empty array format to match expected structure
            }
            throw error;
        }
    };

    export const createTask = async (taskData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(taskData),
        });
        return handleResponse(response);
    };
    
    export const getTaskDetails = async (taskId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    };

    export const getTaskHistory = async (taskId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/history`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    };

    export const updateTask = async (taskId, taskData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(taskData),
        });
        return handleResponse(response);
    };

    export const deleteTask = async (taskId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId),
        });
        if (response.status === 204) {
            return { success: true };
        }
        return handleResponse(response);
    };

    export const startTaskTimer = async (taskId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/timer/start`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    };

    export const stopTaskTimer = async (taskId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/timer/stop`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    };

    export const addManuallyLoggedTime = async (taskId, timeData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/timer/manual`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(timeData),
        });
        return handleResponse(response);
    };

    export const listTodos = async (agencyId, token) => {
        try {
            const response = await fetch(`${TASKS_API_BASE_URL}/todos`, {
                method: 'GET',
                headers: getAuthHeaders(token, 'application/json', agencyId),
            });
            return handleResponse(response);
        } catch (error) {
            // Handle network errors (service not running, CORS, etc.)
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
                console.warn('Task service not available at', TASKS_API_BASE_URL, '- returning empty array');
                return { items: [] }; // Return empty array format to match expected structure
            }
            throw error;
        }
    };

    export const createTodo = async (todoData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/todos`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(todoData),
        });
        return handleResponse(response);
    };

    export const updateTodo = async (todoId, todoData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/todos/${todoId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(todoData),
        });
        return handleResponse(response);
    };

    export const deleteTodo = async (todoId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/todos/${todoId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId),
        });
        if (response.status === 204) {
            return { success: true };
        }
        return handleResponse(response);
    };

    export const addTaskSubtask = async (taskId, subtaskData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/subtasks`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(subtaskData),
        });
        return handleResponse(response);
    };

    export const updateTaskSubtask = async (taskId, subtaskId, subtaskData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/subtasks/${subtaskId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(subtaskData),
        });
        return handleResponse(response);
    };

    export const deleteTaskSubtask = async (taskId, subtaskId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/subtasks/${subtaskId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId),
        });
        if (response.status === 204) {
            return { success: true };
        }
        return handleResponse(response);
    };