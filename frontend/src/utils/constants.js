// User roles
export const USER_ROLES = {
  DONOR: 'donor',
  RECEIVER: 'receiver',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
};

// Food listing status
export const FOOD_LISTING_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

// Food request status
export const FOOD_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Match status
export const MATCH_STATUS = {
  MATCHED: 'matched',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Delivery tracking status
export const DELIVERY_STATUS = {
  EN_ROUTE_TO_DONOR: 'en_route_to_donor',
  AT_DONOR: 'at_donor',
  EN_ROUTE_TO_RECEIVER: 'en_route_to_receiver',
  DELIVERED: 'delivered',
};

// Notification types
export const NOTIFICATION_TYPES = {
  FOOD_REQUEST: 'food_request',
  MATCH_CREATED: 'match_created',
  VOLUNTEER_ASSIGNMENT: 'volunteer_assignment',
  SAFETY_ALERT: 'safety_alert',
  DELIVERY_UPDATE: 'delivery_update',
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh-token',
    VERIFY: '/auth/verify-session',
  },
  PROFILE: '/profile',
  FOOD_LISTINGS: '/food-listings',
  FOOD_REQUESTS: '/food-requests',
  MATCHES: '/matches',
  NOTIFICATIONS: '/notifications',
  ADMIN: {
    METRICS: '/admin/metrics',
    VERIFICATIONS: '/admin/pending-verifications',
  },
};