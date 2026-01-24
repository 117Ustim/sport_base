import { useState, useEffect } from 'react';
import { exercisesService } from '../firebase/services';

/**
 * Custom hook for loading exercises data
 * @param {Object} filters - Optional filters (e.g., { sex: 'male' })
 * @returns {Object} { exercises, loading, error, refetch, setExercises }
 */
export const useExercises = (filters = {}) => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadExercises = () => {
    setLoading(true);
    setError(null);
    
    const loadPromise = filters.sex 
      ? exercisesService.getBySex(filters.sex)
      : exercisesService.getAll();
    
    loadPromise
      .then(setExercises)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { 
    exercises, 
    loading, 
    error,
    refetch: loadExercises,
    setExercises 
  };
};
