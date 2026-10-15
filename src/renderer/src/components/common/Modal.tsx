import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  noPadding?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
  noPadding = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050B1F]/80 backdrop-blur-md animate-fade-in">
      <div
        className={`glass-elevated rounded-2xl w-full ${maxWidths[maxWidth]} shadow-elevated flex flex-col max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(91,145,255,0.18)]">
          <div>
            <h3 className="text-base font-semibold text-studio-100">{title}</h3>
            {subtitle && <p className="text-xs text-studio-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-studio-400 hover:text-studio-100 hover:bg-studio-750/70 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className={`overflow-y-auto flex-1 ${noPadding ? '' : 'px-6 py-5'}`}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[rgba(91,145,255,0.18)] bg-[#081633]/70 backdrop-blur-md flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
