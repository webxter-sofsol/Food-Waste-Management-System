import { useState, useCallback } from 'react';
import api from '../services/api';
import { getErrorMessage } from '../utils/helpers';

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (config) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api(config);
      return { data: response.data, error: null };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((url, config = {}) => {
    return request({ method: 'GET', url, ...config });
  }, [request]);

  const post = useCallback((url, data, config = {}) => {
    return request({ method: 'POST', url, data, ...config });
  }, [request]);

  const put = useCallback((url, data, config = {}) => {
    return request({ method: 'PUT', url, data, ...config });
  }, [request]);

  const del = useCallback((url, config = {}) => {
    return request({ method: 'DELETE', url, ...config });
  }, [request]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    get,
    post,
    put,
    delete: del,
    clearError,
  };
};

export default useApi;