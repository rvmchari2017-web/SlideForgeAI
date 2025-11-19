// FIX: Removed invalid file header that was causing a syntax error.
import React, { useEffect } from 'react';
import { CheckCircleIcon, XIcon } from './icons';

interface ToastProps {
  message: string;
  onClose: () => void;
}

// A toast notification component for displaying transient messages.
const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  // Automatically close the toast after 5 seconds.
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 bg-white shadow-lg rounded-lg p-4 flex items-center space-x-4 z-50 animate-fade-in-down">
      <CheckCircleIcon className="w-6 h-6 text-green-500" />
      <p className="text-gray-700">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;