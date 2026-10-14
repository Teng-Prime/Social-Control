import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 bg-studio-850/50 border border-dashed border-studio-750 rounded-xl my-4 ${className}`}
    >
      <div className="p-3 bg-studio-800 text-studio-400 rounded-2xl mb-3 shadow-subtle">
        {icon}
      </div>
      <h4 className="text-base font-semibold text-studio-200 mb-1">{title}</h4>
      <p className="text-xs text-studio-400 max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
