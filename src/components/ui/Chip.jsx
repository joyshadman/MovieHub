import React from 'react';
import { X } from 'lucide-react';

// Figma Chip sheet: dark raised pill, rose when selected.
const Chip = ({ selected = false, onClick, onRemove, children, className = '', as, ...props }) => {
  const look = selected
    ? 'bg-accent text-white border-accent'
    : 'bg-raised/70 text-white border-line hover:bg-white/10';
  const classes = `inline-flex items-center gap-1.5 h-9 px-4 rounded-full border text-sm font-medium whitespace-nowrap motion-safe:transition-colors duration-200 ${look} ${className}`;

  if (onRemove) {
    return (
      <span className={classes} {...props}>
        {children}
        <button type="button" onClick={onRemove} aria-label={`Remove ${typeof children === 'string' ? children : 'filter'}`} className="-mr-1 rounded-full p-0.5 hover:bg-white/15">
          <X size={14} aria-hidden="true" />
        </button>
      </span>
    );
  }
  if (onClick || as === 'button') {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={classes} {...props}>
        {children}
      </button>
    );
  }
  return <span className={classes} {...props}>{children}</span>;
};

// Small outlined badge used for meta like "MOVIE", "TV".
export const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center h-6 px-2 rounded-md border border-line-strong text-[11px] font-semibold uppercase tracking-[0.06em] text-white ${className}`}>
    {children}
  </span>
);

export default Chip;
