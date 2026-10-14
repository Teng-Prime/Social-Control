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
      className={`bg-studio-850 border border-studio-750/70 rounded-xl p-5 shadow-subtle ${
        hoverable ? 'hover:border-studio-600 transition-all cursor-pointer hover:bg-studio-800/80' : ''
      } ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-studio-750/50">
          <div>
            {title && <h3 className="font-semibold text-studio-100 text-base">{title}</h3>}
            {subtitle && <p className="text-xs text-studio-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
