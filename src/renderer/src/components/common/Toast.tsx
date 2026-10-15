import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />,
          warn: <AlertTriangle className="text-amber-400 shrink-0" size={18} />,
          error: <XCircle className="text-rose-400 shrink-0" size={18} />,
          info: <Info className="text-brand-400 shrink-0" size={18} />,
        };

        const borders = {
          success: 'border-emerald-500/40 bg-[#0B1D3B]/95 shadow-[0_4px_24px_rgba(22,217,160,0.18)]',
          warn: 'border-amber-500/40 bg-[#0B1D3B]/95 shadow-[0_4px_24px_rgba(255,190,85,0.18)]',
          error: 'border-rose-500/40 bg-[#0B1D3B]/95 shadow-[0_4px_24px_rgba(255,92,122,0.18)]',
          info: 'border-brand-500/40 bg-[#0B1D3B]/95 shadow-[0_4px_24px_rgba(8,123,255,0.18)]',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-elevated backdrop-blur-xl transition-all animate-slide-up ${borders[toast.type]}`}
          >
            <div className="mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-semibold text-studio-100">{toast.title}</h5>
              {toast.message && (
                <p className="text-xs text-studio-400 mt-0.5 leading-relaxed break-words">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-studio-400 hover:text-studio-200 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
