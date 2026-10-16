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
    brand: 'bg-[#087BFF]/15 text-[#338EFF] border-[#087BFF]/35',
    cyan: 'bg-[#00C8F5]/15 text-[#00C8F5] border-[#00C8F5]/35',
    purple: 'bg-[#7865FF]/15 text-[#9B8CFF] border-[#7865FF]/35',
    success: 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/35',
    warning: 'bg-[#FFB84D]/15 text-[#FFB84D] border-[#FFB84D]/35',
    danger: 'bg-[#FF5D73]/15 text-[#FF5D73] border-[#FF5D73]/35',
    neutral: 'bg-[#0A1933]/90 text-[#91A4C5] border-[#18345C]',
  };

  const dots = {
    brand: 'bg-[#087BFF] shadow-[0_0_8px_#087BFF]',
    cyan: 'bg-[#00C8F5] shadow-[0_0_8px_#00C8F5]',
    purple: 'bg-[#7865FF] shadow-[0_0_8px_#7865FF]',
    success: 'bg-[#00D6A0] shadow-[0_0_8px_#00D6A0]',
    warning: 'bg-[#FFB84D] shadow-[0_0_8px_#FFB84D]',
    danger: 'bg-[#FF5D73] shadow-[0_0_8px_#FF5D73]',
    neutral: 'bg-[#91A4C5]',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1.5 font-semibold tracking-wide',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold tracking-wide',
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
