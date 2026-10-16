import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050B1D] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none';

  const variants = {
    primary:
      'bg-gradient-to-r from-[#087BFF] to-[#00C8F5] hover:from-[#0065DB] hover:to-[#00AEE0] text-white shadow-[0_0_16px_rgba(0,200,245,0.3)] font-semibold focus:ring-[#087BFF] border border-cyan-400/40',
    cyan:
      'bg-[#00C8F5] hover:bg-[#00AEE0] text-[#050B1D] shadow-[0_0_16px_rgba(0,200,245,0.35)] font-bold focus:ring-[#00C8F5] border border-cyan-300',
    secondary:
      'bg-[#0B1D3B] hover:bg-[#102A50] text-[#F1F5FF] border border-[#18345C] hover:border-[#00C8F5]/50 shadow-subtle focus:ring-[#087BFF]',
    outline:
      'border border-[#18345C] hover:border-[#087BFF] text-[#91A4C5] hover:text-white hover:bg-[#087BFF]/10 focus:ring-[#087BFF]',
    danger:
      'bg-[#FF5D73]/15 hover:bg-[#FF5D73]/25 text-[#FF5D73] border border-[#FF5D73]/30 focus:ring-[#FF5D73]',
    ghost:
      'hover:bg-[#0B1D3B]/70 text-[#91A4C5] hover:text-[#F1F5FF] focus:ring-[#087BFF]',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
