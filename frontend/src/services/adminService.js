import api from './api';

/**
 * Admin Service
 * Handles all admin-related API calls
 */

/**
 * Get all pending user verifications
 * @returns {Promise<Object>} Response with pending users list
 */
export const getPendingVerifications = async () => {
  try {
    const response = await api.get('/admin/pending-verifications');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch pending verifications',
      fieldErrors: error.response?.data?.details || {},
    };
  }
};

/**
 * Approve a user's registration
 * @param {number} userId - User ID to approve
 * @returns {Promise<Object>} Response with success status
 */
export const verifyUser = async (userId) => {
  try {
    const response = await api.put(`/admin/users/${userId}/verify`);
    return {
      success: true,
      data: response.data,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to verify user',
    };
  }
};

/**
 * Reject a user's registration
 * @param {number} userId - User ID to reject
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} Response with success status
 */
export const rejectUser = async (userId, reason) => {
  try {
    const response = await api.put(`/admin/users/${userId}/reject`, { reason });
    return {
      success: true,
      data: response.data,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to reject user',
      fieldErrors: error.response?.data?.details || {},
    };
  }
};

/**
 * Get admin dashboard metrics
 * @returns {Promise<Object>} Response with metrics data
 */
export const getAdminMetrics = async () => {
  try {
    const response = await api.get('/admin/metrics');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch admin metrics',
    };
  }
};

/**
 * Get admin reports with filters
 * @param {Object} filters - Report filters (start_date, end_date, role, location, type)
 * @returns {Promise<Object>} Response with report data
 */
export const getAdminReports = async (filters = {}) => {
  try {
    const response = await api.get('/admin/reports', { params: filters });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch admin reports',
    };
  }
};

/**
 * Get pending food listings awaiting admin approval
 * @returns {Promise<Object>} Response with pending listings list
 */
export const getPendingListings = async () => {
  try {
    const response = await api.get('/admin/listings/pending/');
    return { success: true, data: response.data.results || [] };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch pending listings',
    };
  }
};

/**
 * Approve a pending food listing
 * @param {number} listingId - Listing ID to approve
 * @returns {Promise<Object>} Response with success status
 */
export const approveListing = async (listingId) => {
  try {
    const response = await api.put(`/admin/listings/${listingId}/approve/`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to approve listing',
    };
  }
};

/**
 * Reject a pending food listing
 * @param {number} listingId - Listing ID to reject
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} Response with success status
 */
export const rejectListing = async (listingId, reason) => {
  try {
    const response = await api.put(`/admin/listings/${listingId}/reject/`, { reason });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to reject listing',
    };
  }
};

/**
 * Get all users with full profile details (admin only)
 * @param {Object} params - Filter params (role, verification_status, search, page, page_size)
 */
export const getAllUsers = async (params = {}) => {
  try {
    const response = await api.get('/admin/users/', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch users',
    };
  }
};

/**
 * Get full details for a single user (admin only)
 * @param {number} userId
 */
export const getUserDetail = async (userId) => {
  try {
    const response = await api.get(`/admin/users/${userId}/`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch user',
    };
  }
};

/**
 * Admin manually issues a donation certificate to a donor for a given match.
 * Also marks the match as completed if it isn't already.
 * @param {number} matchId - Match ID
 * @returns {Promise<Object>} Response with success message
 */
export const issueCertificate = async (matchId) => {
  try {
    const response = await api.post(`/admin/matches/${matchId}/issue-certificate/`);
    return { success: true, data: response.data, message: response.data.message };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to issue certificate',
    };
  }
};

/**
 * Export admin report
 * @param {Object} exportData - Export parameters (format, type, filters)
 * @returns {Promise<Object>} Response with export data
 */
export const exportReport = async (exportData) => {
  try {
    const response = await api.post('/admin/reports/export', exportData, {
      responseType: exportData.format === 'csv' ? 'blob' : 'json',
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to export report',
    };
  }
};

const adminService = {
  getPendingVerifications,
  verifyUser,
  rejectUser,
  getAdminMetrics,
  getAdminReports,
  exportReport,
  getPendingListings,
  approveListing,
  rejectListing,
  getAllUsers,
  getUserDetail,
  issueCertificate,
};

export default adminService;
