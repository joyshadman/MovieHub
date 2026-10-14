import React, { useId, useState } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';

// Figma Input sheet: label above, icon inside a dark field, error text below.
export const TextField = ({ label, icon, error, type = 'text', className = '', inputClassName = '', ...props }) => {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-white/85 mb-2">{label}</label>
      <div
        className={`flex items-center gap-3 h-[52px] px-4 rounded-control bg-white/[0.06] border motion-safe:transition-colors duration-200 focus-within:border-accent-text ${
          error ? 'border-accent-text' : 'border-line-strong'
        }`}
      >
        {icon && <span className="text-subtle shrink-0" aria-hidden="true">{icon}</span>}
        <input
          id={id}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`flex-1 min-w-0 bg-transparent text-base text-white placeholder:text-subtle focus:outline-none ${inputClassName}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="text-subtle hover:text-white rounded-full p-1"
          >
            {reveal ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-accent-text">{error}</p>}
    </div>
  );
};

// Filter bar select: "Label Value ⌄" pill, backed by a native select for keyboard and screen readers.
export const SelectPill = ({ label, value, onChange, options, className = '' }) => {
  const id = useId();
  const current = options.find((o) => String(o.value) === String(value));
  return (
    <div className={`relative inline-flex items-center h-10 rounded-control border border-line-strong bg-white/[0.04] hover:bg-white/[0.08] focus-within:border-accent-text motion-safe:transition-colors ${className}`}>
      <label htmlFor={id} className="pl-3.5 pr-1.5 text-sm text-muted whitespace-nowrap pointer-events-none">{label}</label>
      <span className="pr-8 text-sm font-semibold text-white whitespace-nowrap pointer-events-none">{current?.label}</span>
      <ChevronDown size={16} className="absolute right-3 text-muted pointer-events-none" aria-hidden="true" />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-sheet text-white">{o.label}</option>
        ))}
      </select>
    </div>
  );
};

export const Checkbox = ({ label, checked, onChange, children }) => {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] rounded accent-[var(--color-accent)] cursor-pointer"
      />
      <label htmlFor={id} className="text-sm text-muted cursor-pointer">{label || children}</label>
    </div>
  );
};
