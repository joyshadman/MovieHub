import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Helmet } from 'react-helmet';
import Logo from './Logo';
import { DEFAULT_MAINTENANCE_MESSAGE } from '../services/siteConfig';

// What every visitor except the owner sees while config/site.maintenance is on (spec 0003).
const Maintenance = ({ message }) => (
  <div className="font-body min-h-screen bg-canvas text-white flex flex-col items-center justify-center px-6 py-16 text-center">
    <Helmet><title>MovieHub · Back soon</title></Helmet>
    <Logo className="text-[34px]" />
    <span className="mt-10 flex h-16 w-16 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent-text">
      <Wrench size={26} aria-hidden="true" />
    </span>
    <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-[-0.03em]">We are under maintenance</h1>
    <p className="mt-4 max-w-md text-sm md:text-base leading-7 text-muted" role="status">{message || DEFAULT_MAINTENANCE_MESSAGE}</p>
    <p className="mt-10 text-xs text-white/35">
      Site owner? <Link to="/login" className="underline hover:text-white">Sign in</Link>
    </p>
  </div>
);

export default Maintenance;
