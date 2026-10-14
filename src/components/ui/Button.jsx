import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Figma Button sheet: primary (rose), light (white), glass, outline; pill shaped.
const VARIANTS = {
  primary: 'bg-accent text-white shadow-glow hover:bg-accent-hover hover:shadow-[0_14px_36px_-8px_rgb(225_29_72/0.75)] active:bg-accent-press',
  light: 'bg-white text-black hover:bg-white/90 hover:shadow-[0_12px_32px_-10px_rgb(255_255_255/0.45)] active:bg-white/80',
  glass: 'glass text-white hover:bg-white/15 active:bg-white/20',
  outline: 'border border-line-strong text-white hover:bg-white/5 active:bg-white/10',
  ghost: 'text-muted hover:text-white hover:bg-white/5',
};

const SIZES = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-6 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2.5',
};

const base =
  'inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap select-none ' +
  'motion-safe:transition-all duration-200 ease-out motion-safe:active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';

const Button = ({
  variant = 'primary', size = 'md', to, href, loading = false, icon, className = '',
  children, disabled, type = 'button', ...props
}) => {
  const classes = `${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : icon}
      {children}
    </>
  );
  if (to) return <Link to={to} className={classes} {...props}>{content}</Link>;
  if (href) return <a href={href} className={classes} {...props}>{content}</a>;
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
};

// Figma Icon Button sheet: circular glass or raised button holding one icon.
export const IconButton = ({ label, variant = 'glass', size = 'md', active = false, className = '', children, to, href, ...props }) => {
  const dims = { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-14 w-14' }[size];
  const look = active
    ? 'bg-accent text-white border border-accent'
    : {
        glass: 'glass text-white hover:bg-white/15',
        raised: 'bg-raised text-white border border-line hover:bg-white/15',
        plain: 'text-muted hover:text-white hover:bg-white/10',
      }[variant];
  const classes = `inline-flex items-center justify-center rounded-full shrink-0 motion-safe:transition-all duration-200 ease-out motion-safe:hover:scale-105 motion-safe:active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed ${dims} ${look} ${className}`;
  if (to) return <Link to={to} aria-label={label} title={label} className={classes} {...props}>{children}</Link>;
  if (href) return <a href={href} aria-label={label} title={label} className={classes} {...props}>{children}</a>;
  return (
    <button type="button" aria-label={label} title={label} className={classes} {...props}>
      {children}
    </button>
  );
};

export default Button;
