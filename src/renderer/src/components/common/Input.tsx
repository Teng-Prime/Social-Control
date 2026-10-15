import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-studio-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-studio-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-[#081633]/90 border rounded-xl px-3.5 py-2 text-sm text-studio-100 placeholder-studio-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${
            icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-rose-500/80 focus:ring-rose-500'
              : 'border-[rgba(91,145,255,0.22)] hover:border-brand-500/40'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-studio-500">{helperText}</p>
      ) : null}
    </div>
  );
};
