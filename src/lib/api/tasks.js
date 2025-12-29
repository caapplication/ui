import { getAuthHeaders, handleResponse } from './utils';

    const TASKS_API_BASE_URL = import.meta.env.VITE_TASK_API_URL || 'http://127.0.0.1:8005';

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

    // Task Stage Management APIs
    export const listTaskStages = async (agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/task-stages/`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    };

    export const createTaskStage = async (stageData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/task-stages/`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(stageData),
        });
        return handleResponse(response);
    };

    export const updateTaskStage = async (stageId, stageData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/task-stages/${stageId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(stageData),
        });
        return handleResponse(response);
    };

    export const deleteTaskStage = async (stageId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/task-stages/${stageId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId),
        });
        if (response.status === 204) {
            return { success: true };
        }
        return handleResponse(response);
    };

    // Task Comments APIs
    export const listTaskComments = async (taskId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/comments/`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    };

    export const createTaskComment = async (taskId, commentData, agencyId, token) => {
        // Check if commentData is FormData (for file uploads)
        const isFormData = commentData instanceof FormData;
        
        const headers = isFormData 
            ? getAuthHeaders(token, null, agencyId) // Don't set Content-Type for FormData, browser will set it with boundary
            : getAuthHeaders(token, 'application/json', agencyId);
        
        const body = isFormData 
            ? commentData 
            : JSON.stringify(commentData);
        
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/comments/`, {
            method: 'POST',
            headers: headers,
            body: body,
        });
        return handleResponse(response);
    };

    export const updateTaskComment = async (taskId, commentId, commentData, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/comments/${commentId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify(commentData),
        });
        return handleResponse(response);
    };

    export const deleteTaskComment = async (taskId, commentId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId),
        });
        if (response.status === 204) {
            return { success: true };
        }
        return handleResponse(response);
    };

    // Collaborator functions
    export const addTaskCollaborator = async (taskId, userId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/collaborators/`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify({ user_id: userId }),
        });
        return handleResponse(response);
    };

    export const removeTaskCollaborator = async (taskId, userId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/collaborators/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token, null, agencyId),
        });
        if (response.status === 204) {
            return { success: true };
        }
        return handleResponse(response);
    };

    export const getTaskCollaborators = async (taskId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/collaborators/`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    };

    // Get read receipts for a comment
    export const getCommentReadReceipts = async (taskId, commentId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/comments/${commentId}/reads`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    };

    // Task Closure Request APIs
    export const requestTaskClosure = async (taskId, requestMessage, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/closure-request`, {
            method: 'POST',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify({ request_message: requestMessage || null }),
        });
        return handleResponse(response);
    };

    export const getClosureRequest = async (taskId, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/closure-request`, {
            method: 'GET',
            headers: getAuthHeaders(token, 'application/json', agencyId),
        });
        return handleResponse(response);
    };

    export const reviewClosureRequest = async (taskId, requestId, status, reason, agencyId, token) => {
        const response = await fetch(`${TASKS_API_BASE_URL}/tasks/${taskId}/closure-request/${requestId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, 'application/json', agencyId),
            body: JSON.stringify({ 
                status,
                reason: reason || null
            }),
        });
        return handleResponse(response);
    };