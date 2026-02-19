import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            min-w-[320px] p-4 rounded-lg shadow-2xl border flex items-center gap-4 animate-slide-in-right backdrop-blur-xl
            ${toast.type === 'success' ? 'bg-[#09090b]/90 border-brand-gold/50 text-white shadow-brand-gold/10' : ''}
            ${toast.type === 'error' ? 'bg-[#09090b]/90 border-red-500/50 text-white shadow-red-500/10' : ''}
            ${toast.type === 'info' ? 'bg-[#09090b]/90 border-zinc-700 text-white' : ''}
          `}
        >
          {toast.type === 'success' && <div className="p-1 bg-brand-gold/10 rounded-full"><CheckCircle className="w-5 h-5 text-brand-gold" /></div>}
          {toast.type === 'error' && <div className="p-1 bg-red-500/10 rounded-full"><AlertCircle className="w-5 h-5 text-red-400" /></div>}
          <span className="text-sm font-medium flex-1 tracking-wide">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;