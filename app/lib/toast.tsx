'use client';

import { toast as reactToast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
}

export function useToast() {
  return {
    toast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      if (type === 'success') reactToast.success(message);
      else if (type === 'error') reactToast.error(message);
      else reactToast.info(message);
    },
  };
}
