import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-5 transition-all duration-200 ${
        hoverable
          ? 'hover:border-brand-500/40 hover:shadow-[0_8px_30px_rgba(8,123,255,0.18)] hover:bg-studio-800/80 cursor-pointer'
          : ''
      } ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-[rgba(91,145,255,0.14)]">
          <div>
            {title && <h3 className="font-semibold text-studio-100 text-sm tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-studio-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
