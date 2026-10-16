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
      className={`glass-card rounded-2xl p-5 transition-all duration-200 border border-[#18345C] bg-[#0A1933]/90 ${
        hoverable
          ? 'hover:border-[#00C8F5]/50 hover:shadow-[0_8px_30px_rgba(0,200,245,0.12)] hover:bg-[#0D2040]/90 cursor-pointer'
          : ''
      } ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-[#18345C]/80">
          <div>
            {title && <h3 className="font-bold text-[#F1F5FF] text-sm tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[#91A4C5] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
