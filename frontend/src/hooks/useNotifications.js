import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Custom hook to fetch and manage notifications
 * Polls for unread notification count every 30 seconds
 */
const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (err) {
      // Silently handle 404 errors (endpoint not implemented yet)
      if (err.response?.status === 404) {
        setUnreadCount(0);
        return;
      }
      console.error('Failed to fetch notification count:', err);
      setError(err.message);
    }
  };

  // Fetch all notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/notifications');
      if (response.data) {
        setNotifications(response.data.results || response.data);
      }
    } catch (err) {
      // Silently handle 404 errors (endpoint not implemented yet)
      if (err.response?.status === 404) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      console.error('Failed to fetch notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err) {
      // Silently handle 404 errors (endpoint not implemented yet)
      if (err.response?.status === 404) {
        return;
      }
      console.error('Failed to mark notification as read:', err);
      setError(err.message);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
    } catch (err) {
      // Silently handle 404 errors (endpoint not implemented yet)
      if (err.response?.status === 404) {
        return;
      }
      console.error('Failed to mark all notifications as read:', err);
      setError(err.message);
    }
  };

  // Poll for unread count every 30 seconds
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  return {
    unreadCount,
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refreshCount: fetchUnreadCount,
  };
};

export default useNotifications;
