import { useState, useEffect } from 'react';
import { gymsService } from '../firebase/services';

/**
 * Custom hook for loading gyms data
 * @returns {Object} { gyms, loading, error, refetch }
 */
export const useGyms = () => {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGyms = () => {
    setLoading(true);
    setError(null);
    
    gymsService.getAll()
      .then(setGyms)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGyms();
  }, []);

  return { 
    gyms, 
    loading, 
    error,
    refetch: loadGyms 
  };
};
