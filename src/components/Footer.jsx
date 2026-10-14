import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Search, Bookmark } from 'lucide-react';
import Logo from './Logo';
import { IconButton } from './ui/Button';

// Figma "Footer / Desktop". Only links to pages that exist in the app.
const COLUMNS = [
  {
    title: 'Browse',
    links: [
      { name: 'Home', path: '/' },
      { name: 'Movies', path: '/movies' },
      { name: 'TV Shows', path: '/tv' },
      { name: 'Categories', path: '/categories' },
    ],
  },
  {
    title: 'Collections',
    links: [
      { name: 'Best of Bangla', path: '/collection/bangla' },
      { name: 'Bollywood', path: '/collection/bollywood' },
      { name: 'Korean Wave', path: '/collection/korean' },
      { name: 'Anime', path: '/collection/anime' },
    ],
  },
  {
    title: 'MovieHub',
    links: [
      { name: 'My List', path: '/mylist' },
      { name: 'Search', path: '/search' },
      { name: 'About', path: '/about' },
    ],
  },
];

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="font-body bg-surface border-t border-line mt-16">
      <div className="px-4 md:px-8 lg:px-16 pt-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div className="col-span-2 md:col-span-1">
            <Logo className="text-[32px]" />
            <p className="mt-4 text-sm text-muted max-w-[260px]">
              Stories that stay with you. Stream thousands of movies and shows, anywhere.
            </p>
            <div className="mt-6 flex gap-3">
              <IconButton label="MovieHub on GitHub" variant="raised" size="sm" href="https://github.com/joyshadman" target="_blank" rel="noopener noreferrer">
                <Github size={16} aria-hidden="true" />
              </IconButton>
              <IconButton label="Search" variant="raised" size="sm" to="/search">
                <Search size={16} aria-hidden="true" />
              </IconButton>
              <IconButton label="My List" variant="raised" size="sm" to="/mylist">
                <Bookmark size={16} aria-hidden="true" />
              </IconButton>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold text-white mb-4">{col.title}</h2>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-sm text-muted hover:text-white">{link.name}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted">© {year} MovieHub. All rights reserved.</p>
          <p className="text-xs text-subtle">Movie data from TMDB.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
