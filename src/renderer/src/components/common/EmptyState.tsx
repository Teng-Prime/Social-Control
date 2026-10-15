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
      className={`flex flex-col items-center justify-center text-center p-8 glass-card border border-dashed border-[rgba(91,145,255,0.22)] rounded-2xl my-4 ${className}`}
    >
      <div className="p-3.5 bg-studio-750/80 text-cyan-400 rounded-2xl mb-3 shadow-[0_0_20px_rgba(0,200,255,0.2)] border border-cyan-500/20">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-studio-100 mb-1">{title}</h4>
      <p className="text-xs text-studio-400 max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
