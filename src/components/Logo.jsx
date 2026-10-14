import React from 'react';
import { Link } from 'react-router-dom';

// MOVIEHUB wordmark from the Figma logo sheet, as real text (spec 0001).
// Resize through className, e.g. <Logo className="text-2xl md:text-3xl" />.
const Logo = ({ className = '' }) => (
  <Link
    to="/"
    aria-label="MovieHub"
    className={`font-display text-3xl tracking-wide leading-none ${className}`}
  >
    <span aria-hidden="true" className="text-accent">MOVIE</span>
    <span aria-hidden="true" className="text-white">HUB</span>
  </Link>
);

export default Logo;
