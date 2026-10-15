import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  helperText,
  error,
  options,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-studio-300 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full bg-[#081633]/90 border rounded-xl px-3.5 py-2 text-sm text-studio-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all cursor-pointer ${
          error
            ? 'border-rose-500/80 focus:ring-rose-500'
            : 'border-[rgba(91,145,255,0.22)] hover:border-brand-500/40'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#081633] text-studio-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-studio-500">{helperText}</p>
      ) : null}
    </div>
  );
};
