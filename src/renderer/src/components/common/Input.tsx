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
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#F1F5FF] mb-1.5 tracking-tight">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#91A4C5]">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-[#07122A] border rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#F1F5FF] placeholder-[#546F96] focus:outline-none focus:ring-1 focus:ring-[#00C8F5]/40 focus:border-[#00C8F5] transition-all ${
            icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-[#FF5D73] focus:ring-[#FF5D73]'
              : 'border-[#18345C] hover:border-[#087BFF]/60'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-[#FF5D73]">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-[#91A4C5]">{helperText}</p>
      ) : null}
    </div>
  );
};
