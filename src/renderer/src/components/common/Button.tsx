import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-studio-900 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none';

  const variants = {
    primary: 'bg-gradient-to-r from-brand-500 via-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 text-white shadow-glow-brand font-semibold focus:ring-brand-500 border border-brand-400/30',
    secondary: 'bg-studio-750/80 hover:bg-studio-750 text-studio-100 border border-[rgba(91,145,255,0.22)] hover:border-brand-500/40 shadow-subtle focus:ring-brand-500',
    outline: 'border border-[rgba(91,145,255,0.28)] hover:border-brand-400 text-studio-300 hover:text-white hover:bg-brand-500/10 focus:ring-brand-500',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 focus:ring-rose-500',
    ghost: 'hover:bg-studio-750/70 text-studio-400 hover:text-studio-100 focus:ring-brand-500',
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
