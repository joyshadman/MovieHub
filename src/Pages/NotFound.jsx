import React from 'react';
import { Home, LayoutGrid, Search } from 'lucide-react';
import Button from '../components/ui/Button';

// Not in Figma: 404 in the Figma style.
const NotFound = () => (
  <div className="font-body text-white min-h-[80vh] flex flex-col items-center justify-center text-center px-4 pt-24 pb-10 bg-[radial-gradient(ellipse_at_center,rgb(225_29_72/0.18),transparent_60%)]">
    <p className="font-display text-[clamp(7rem,22vw,14rem)] leading-none" style={{ color: 'transparent', WebkitTextStroke: '2px rgb(255 255 255 / 0.6)' }} aria-hidden="true">404</p>
    <h1 className="mt-2 text-3xl md:text-4xl font-bold">This page drifted out of orbit</h1>
    <p className="mt-3 text-muted max-w-md">The link may be broken, or the page has moved. Here are a few ways back.</p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Button to="/" icon={<Home size={18} aria-hidden="true" />}>Go home</Button>
      <Button to="/categories" variant="glass" icon={<LayoutGrid size={18} aria-hidden="true" />}>Browse categories</Button>
      <Button to="/search" variant="outline" icon={<Search size={18} aria-hidden="true" />}>Search</Button>
    </div>
  </div>
);

export default NotFound;
