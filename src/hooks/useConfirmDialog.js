import { useState } from 'react';

export const useConfirmDialog = () => {
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
  });

  const showConfirm = (message, onConfirmCallback) => {
    setConfirmDialog({
      isOpen: true,
      message,
      onConfirm: onConfirmCallback,
    });
  };

  const handleConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm();
    }
    setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
  };

  const handleCancel = () => {
    setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
  };

  return {
    confirmDialog,
    showConfirm,
    handleConfirm,
    handleCancel,
  };
};
