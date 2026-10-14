import React from 'react';
import { AlertTriangle, Film, RotateCw } from 'lucide-react';
import Button from './Button';

export const Spinner = ({ size = 40, className = '' }) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block rounded-full border-2 border-white/15 border-t-accent animate-spin ${className}`}
    style={{ width: size, height: size }}
  />
);

export const PageLoader = ({ label = 'Loading', className = 'min-h-[60vh]' }) => (
  <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
    <Spinner />
    <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-muted">{label}</p>
  </div>
);

// Poster shaped shimmer blocks shown while a grid loads.
export const SkeletonGrid = ({ count = 12, className = '' }) => (
  <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4 ${className}`} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="aspect-[2/3] rounded-card bg-card border border-line motion-safe:animate-pulse" />
    ))}
  </div>
);

export const EmptyState = ({ icon, title, message, action, className = '' }) => (
  <div className={`flex flex-col items-center text-center gap-4 py-16 px-6 rounded-panel bg-card border border-line ${className}`}>
    <div className="h-16 w-16 rounded-full bg-raised border border-line flex items-center justify-center text-muted">
      {icon || <Film size={28} aria-hidden="true" />}
    </div>
    <h2 className="text-xl font-semibold text-white">{title}</h2>
    {message && <p className="text-sm text-muted max-w-sm">{message}</p>}
    {action}
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', message = 'We could not load this right now.', onRetry, className = '' }) => (
  <EmptyState
    className={className}
    icon={<AlertTriangle size={28} className="text-accent-text" aria-hidden="true" />}
    title={title}
    message={message}
    action={onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} icon={<RotateCw size={16} aria-hidden="true" />}>
        Try again
      </Button>
    )}
  />
);
