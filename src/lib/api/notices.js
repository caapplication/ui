import { getAuthHeaders, handleResponse } from './utils';

const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003';


export const getNotices = async (entityId, token) => {
  let url = `${FINANCE_API_BASE_URL}/api/notices/`;
  if (entityId && entityId !== 'all') {
    url += `?entity_id=${entityId}`;
  }
  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const getNotice = async (noticeId, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const createNotice = async (formData, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(token),
      'Content-Type': undefined
    },
    body: formData,
  });
};

export const uploadNotice = async (formData, token) => {
  const headers = getAuthHeaders(token);
  delete headers['Content-Type'];

  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/`, {
    method: 'POST',
    headers: headers,
    body: formData,
  });
  return handleResponse(response);
};

export const requestNoticeClosure = async (noticeId, reason, token) => {
  const formData = new FormData();
  if (reason) formData.append('reason', reason);

  const headers = getAuthHeaders(token);
  delete headers['Content-Type'];

  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}/request-close`, {
    method: 'POST',
    headers: headers,
    body: formData
  });
  return handleResponse(response);
};

export const approveNoticeClosure = async (noticeId, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}/approve-close`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const rejectNoticeClosure = async (noticeId, reason, token) => {
  const formData = new FormData();
  if (reason) formData.append('reason', reason);

  const headers = getAuthHeaders(token);
  delete headers['Content-Type'];

  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}/reject-close`, {
    method: 'POST',
    headers: headers,
    body: formData
  });
  return handleResponse(response);
};

export const getNoticeComments = async (noticeId, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}/comments`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const addNoticeComment = async (noticeId, message, file, token) => {
  const formData = new FormData();
  formData.append('message', message);
  if (file) {
    formData.append('file', file);
  }

  const headers = getAuthHeaders(token);
  delete headers['Content-Type'];

  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}/comments`, {
    method: 'POST',
    headers: headers,
    body: formData,
  });
  return handleResponse(response);
};

export const addNoticeCollaborator = async (noticeId, userId, token) => {
  const formData = new FormData();
  formData.append('user_id', userId);

  const headers = getAuthHeaders(token);
  delete headers['Content-Type'];

  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}/collaborators`, {
    method: 'POST',
    headers: headers,
    body: formData,
  });
  return handleResponse(response);
};

export const removeNoticeCollaborator = async (noticeId, userId, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}/collaborators/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  if (response.status === 204) return true;
  return handleResponse(response);
};

export const getUnreadNoticeCount = async (token) => {
  try {
    const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/unread-count`, {
      headers: getAuthHeaders(token),
    });
    const data = await handleResponse(response);
    // Return only unread_comments count, not closure_requests
    // This ensures the dot only shows for actual unread chat messages
    // Handle both cases: when unread_comments exists, or fallback to 0 if only count exists
    const unreadComments = (typeof data.unread_comments === 'number')
      ? data.unread_comments
      : ((typeof data.count === 'number' && typeof data.unread_comments === 'undefined') ? 0 : 0);

    console.log('[getUnreadNoticeCount] Full response:', data);
    console.log('[getUnreadNoticeCount] unread_comments:', data.unread_comments, 'closure_requests:', data.closure_requests, 'total count:', data.count);
    console.log('[getUnreadNoticeCount] Returning unread comments:', unreadComments);

    return unreadComments;
  } catch (error) {
    console.error('[getUnreadNoticeCount] Error:', error);
    return 0;
  }
};

export const markNoticeCommentAsRead = async (noticeId, commentId, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}/comments/${commentId}/read`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const getNoticeCommentReadReceipts = async (noticeId, commentId, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}/comments/${commentId}/reads`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const deleteNotice = async (noticeId, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/${noticeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  if (response.status === 204) return true;
  return handleResponse(response);
};

export const getNoticeDashboardAnalytics = async (days, token) => {
  const response = await fetch(`${FINANCE_API_BASE_URL}/api/notices/dashboard-analytics?days=${days}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

