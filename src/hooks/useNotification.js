import { useState } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState({ 
    show: false, 
    message: '', 
    type: '' 
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  return { notification, showNotification };
};
