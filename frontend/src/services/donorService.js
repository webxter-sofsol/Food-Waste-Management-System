import api from './api';

/**
 * Donor Service
 * Handles all donor-related API calls for food listing management
 */

/**
 * Get donor's own food listings
 * @returns {Promise<Object>} Response with listings array
 */
export const getDonorListings = async () => {
  try {
    const response = await api.get('/food-listings/my/');
    const data = Array.isArray(response.data) ? response.data : response.data.results || [];
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch listings',
    };
  }
};

/**
 * Update a food listing (only allowed before any match is created)
 * @param {number} id - Listing ID
 * @param {Object} data - Updated listing data
 * @returns {Promise<Object>} Response with updated listing
 */
export const updateListing = async (id, data) => {
  try {
    const response = await api.put(`/food-listings/${id}/update/`, data);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to update listing',
      fieldErrors: error.response?.data || {},
    };
  }
};

/**
 * Cancel a food listing with a reason
 * @param {number} id - Listing ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Response with success message
 */
export const cancelListing = async (id, reason) => {
  try {
    const response = await api.delete(`/food-listings/${id}/cancel/`, {
      data: { reason },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to cancel listing',
    };
  }
};

/**
 * Get food requests for a specific listing
 * @param {number} listingId - Listing ID
 * @returns {Promise<Object>} Response with requests array
 */
export const getListingRequests = async (listingId) => {
  try {
    const response = await api.get('/food-requests/list/', {
      params: { listing: listingId },
    });
    const data = Array.isArray(response.data) ? response.data : response.data.results || [];
    const filtered = data.filter((r) => r.listing === listingId || r.listing?.id === listingId);
    return { success: true, data: filtered };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch requests',
    };
  }
};

/**
 * Get all food requests for the donor (across all listings)
 * @returns {Promise<Object>} Response with requests array
 */
export const getAllDonorRequests = async () => {
  try {
    const response = await api.get('/food-requests/list/');
    const data = Array.isArray(response.data) ? response.data : response.data.results || [];
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch requests',
    };
  }
};

/**
 * Get listing performance metrics derived from available data
 * @param {Object} listing - The listing object
 * @param {Array} requests - Requests for this listing
 * @param {Array} matches - Matches for this listing
 * @returns {Object} Metrics object
 */
export const getListingMetrics = (listing, requests = [], matches = []) => {
  const listingRequests = requests.filter(
    (r) => r.listing === listing.id || r.listing?.id === listing.id
  );
  const listingMatches = matches.filter(
    (m) => m.listing === listing.id || m.listing?.id === listing.id
  );
  return {
    views: listing.view_count || 0,
    requests: listingRequests.length,
    matches: listingMatches.length,
    pendingRequests: listingRequests.filter((r) => r.status === 'pending').length,
  };
};

/**
 * Approve a food request
 * @param {number} requestId - Request ID
 * @returns {Promise<Object>} Response
 */
export const approveRequest = async (requestId) => {
  try {
    const response = await api.put(`/food-requests/${requestId}/approve/`);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to approve request',
    };
  }
};

/**
 * Reject a food request
 * @param {number} requestId - Request ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Response
 */
export const rejectRequest = async (requestId, reason) => {
  try {
    const response = await api.put(`/food-requests/${requestId}/reject/`, {
      rejection_reason: reason,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to reject request',
    };
  }
};

/**
 * Get all completed matches (receipts) for the donor
 * @returns {Promise<Object>} Response with receipts array
 */
export const getDonorCertificates = async () => {
  try {
    const response = await api.get('/matches/certificates/');
    const data = response.data.results || [];
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch certificates',
    };
  }
};

/**
 * Download a donation certificate PDF for a completed match
 * @param {number} matchId - Match ID
 * @returns {Promise<Object>} Response with blob data
 */
export const downloadCertificate = async (matchId) => {
  try {
    const response = await api.get(`/matches/${matchId}/certificate/`, {
      responseType: 'blob',
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to download certificate',
    };
  }
};

const donorService = {
  getDonorListings,
  updateListing,
  cancelListing,
  getListingRequests,
  getAllDonorRequests,
  getListingMetrics,
  approveRequest,
  rejectRequest,
  getDonorCertificates,
  downloadCertificate,
};

export default donorService;
