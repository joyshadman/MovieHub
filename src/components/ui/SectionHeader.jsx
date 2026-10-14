import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Row heading from the Figma home frame: title left, "See all" right.
const SectionHeader = ({ title, to, linkLabel = 'See all', action, id, className = '' }) => (
  <div className={`flex items-center justify-between gap-4 mb-4 ${className}`}>
    <h2 id={id} className="text-lg md:text-xl font-semibold text-white">{title}</h2>
    {action}
    {!action && to && (
      <Link to={to} className="inline-flex items-center gap-1 text-sm text-muted hover:text-white rounded-full px-2 py-1">
        {linkLabel} <ChevronRight size={16} aria-hidden="true" />
      </Link>
    )}
  </div>
);

export default SectionHeader;
