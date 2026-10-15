import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'cyan' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variants = {
    brand: 'bg-brand-500/15 text-brand-400 border-brand-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    neutral: 'bg-studio-800/80 text-studio-300 border-[rgba(91,145,255,0.18)]',
  };

  const dots = {
    brand: 'bg-brand-400 shadow-[0_0_8px_#087BFF]',
    cyan: 'bg-cyan-400 shadow-[0_0_8px_#00C8FF]',
    purple: 'bg-purple-400 shadow-[0_0_8px_#7865FF]',
    success: 'bg-emerald-400 shadow-[0_0_8px_#16D9A0]',
    warning: 'bg-amber-400 shadow-[0_0_8px_#FFBE55]',
    danger: 'bg-rose-400 shadow-[0_0_8px_#FF5C7A]',
    neutral: 'bg-studio-400',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-sm ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[variant]}`} />}
      {children}
    </span>
  );
};
