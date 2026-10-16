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
        <label htmlFor={selectId} className="block text-xs font-semibold text-[#F1F5FF] mb-1.5 tracking-tight">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full bg-[#07122A] border rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#F1F5FF] focus:outline-none focus:ring-1 focus:ring-[#00C8F5]/40 focus:border-[#00C8F5] transition-all cursor-pointer ${
          error
            ? 'border-[#FF5D73] focus:ring-[#FF5D73]'
            : 'border-[#18345C] hover:border-[#087BFF]/60'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0A1933] text-[#F1F5FF]">
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-[#FF5D73]">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-[#91A4C5]">{helperText}</p>
      ) : null}
    </div>
  );
};
