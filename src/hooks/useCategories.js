import { useState, useEffect } from 'react';
import { categoriesService } from '../firebase/services';

/**
 * Custom hook for loading categories data
 * @returns {Object} { categories, loading, error, refetch }
 */
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCategories = () => {
    setLoading(true);
    setError(null);
    
    categoriesService.getAll()
      .then(setCategories)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return { 
    categories, 
    loading, 
    error,
    refetch: loadCategories 
  };
};
