import React, { useState, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, LogOut, ChevronDown, Bookmark, Home, LayoutGrid, User, LogIn, Film, Tv, Info, ShieldCheck } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { signOutUser } from '../services/authService';
import { isOwner } from '../config/owner';
import Logo from './Logo';
import Avatar from './ui/Avatar';
import Button, { IconButton } from './ui/Button';
import Modal from './ui/Modal';

const NAV_LINKS = [
  { name: 'Home', path: '/', end: true },
  { name: 'Movies', path: '/movies' },
  { name: 'TV Shows', path: '/tv', end: true },
  { name: 'Categories', path: '/categories' },
  { name: 'My List', path: '/mylist' },
  { name: 'About', path: '/about' },
];
// Owner only (spec 0003): the Admin page with maintenance mode and visitor tracking.
const ADMIN_LINK = { name: 'Admin', path: '/admin' };

// Figma Navbar (desktop), Top Bar (mobile) and Tab Bar (mobile).
const Navbar = ({ user }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const watchlist = useWatchlist();
  const libraryCount = watchlist?.count || 0;
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const owner = isOwner(user);
  const navLinks = owner ? [...NAV_LINKS, ADMIN_LINK] : NAV_LINKS;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!showDropdown) return undefined;
    const onDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setShowDropdown(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showDropdown]);

  // Close menus on navigation (adjusting state during render, per React docs).
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setShowDropdown(false);
    setShowAccount(false);
  }

  const handleSignOut = async () => {
    await signOutUser();
    setShowDropdown(false);
    setShowAccount(false);
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `relative px-1 py-2 text-sm motion-safe:transition-colors ${isActive ? 'text-white font-semibold' : 'text-muted hover:text-white'}`;

  const tabClass = ({ isActive }) =>
    `flex flex-1 flex-col items-center justify-center gap-1 h-full text-[11px] font-medium ${isActive ? 'text-accent-text' : 'text-muted'}`;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-full focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">
        Skip to content
      </a>

      <header
        className={`fixed top-0 inset-x-0 z-[130] font-body motion-safe:transition-colors duration-300 ${
          isScrolled ? 'bg-canvas/90 backdrop-blur-xl border-b border-line' : 'bg-gradient-to-b from-black/80 to-transparent border-b border-transparent'
        }`}
      >
        <nav aria-label="Main" className="flex items-center justify-between gap-6 h-16 md:h-20 px-4 md:px-8 lg:px-16">
          <div className="flex items-center gap-8 lg:gap-10 min-w-0">
            <Logo className="text-[28px] md:text-[32px]" />
            <ul className="hidden md:flex items-center gap-4 lg:gap-6">
              {navLinks.map((item) => (
                <li key={item.path}>
                  <NavLink to={item.path} end={item.end} className={linkClass}>{item.name}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <IconButton label="Search" variant="plain" to="/search">
              <Search size={20} aria-hidden="true" />
            </IconButton>

            {user ? (
              <>
                <div className="relative hidden md:block" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowDropdown((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={showDropdown}
                    aria-label="Account menu"
                    className="flex items-center gap-1.5 rounded-xl p-1 hover:bg-white/10"
                  >
                    <Avatar user={user} />
                    <ChevronDown size={16} className={`text-muted motion-safe:transition-transform ${showDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>

                  <AnimatePresence>
                    {showDropdown && (
                      <Motion.div
                        role="menu"
                        initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduce ? 0 : 4 }}
                        transition={{ duration: reduce ? 0 : 0.15 }}
                        className="absolute right-0 top-full mt-3 w-64 rounded-panel bg-sheet border border-line shadow-card p-2"
                      >
                        <div className="flex items-center gap-3 px-3 py-3 border-b border-line mb-1">
                          <Avatar user={user} size={40} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user.displayName || 'Your account'}</p>
                            {user.email && <p className="text-xs text-muted truncate">{user.email}</p>}
                          </div>
                        </div>
                        <Link role="menuitem" to="/mylist" className="flex items-center justify-between rounded-control px-3 py-2.5 text-sm text-white hover:bg-white/10">
                          <span className="flex items-center gap-3"><Bookmark size={16} aria-hidden="true" /> My List</span>
                          {libraryCount > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold">{libraryCount}</span>}
                        </Link>
                        {owner && (
                          <Link role="menuitem" to="/admin" className="flex items-center gap-3 rounded-control px-3 py-2.5 text-sm text-white hover:bg-white/10">
                            <ShieldCheck size={16} aria-hidden="true" /> Admin
                          </Link>
                        )}
                        <button role="menuitem" type="button" onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm text-accent-text hover:bg-white/10">
                          <LogOut size={16} aria-hidden="true" /> Sign out
                        </button>
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button type="button" onClick={() => setShowAccount(true)} aria-label="Account" className="md:hidden rounded-xl">
                  <Avatar user={user} size={34} />
                </button>
              </>
            ) : (
              <span className="hidden sm:block">
                <Button to="/login" state={{ from: location.pathname }} size="sm">Sign In</Button>
              </span>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile tab bar (Figma Tab Bar / Mobile) */}
      <nav aria-label="Mobile" className="md:hidden fixed bottom-0 inset-x-0 z-[130] font-body bg-sheet/95 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16">
          <NavLink to="/" end className={tabClass}><Home size={22} aria-hidden="true" />Home</NavLink>
          <NavLink to="/search" className={tabClass}><Search size={22} aria-hidden="true" />Search</NavLink>
          <NavLink to="/categories" className={tabClass}><LayoutGrid size={22} aria-hidden="true" />Browse</NavLink>
          <NavLink to="/mylist" className={tabClass}><Bookmark size={22} aria-hidden="true" />My List</NavLink>
          <button type="button" onClick={() => setShowAccount(true)} className={tabClass({ isActive: showAccount })} aria-haspopup="dialog">
            <User size={22} aria-hidden="true" />Profile
          </button>
        </div>
      </nav>

      {/* Mobile account sheet */}
      <Modal open={showAccount} onClose={() => setShowAccount(false)} className="max-w-sm">
        {user ? (
          <div className="flex items-center gap-3 mb-6 pr-8">
            <Avatar user={user} size={48} />
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{user.displayName || 'Your account'}</p>
              {user.email && <p className="text-sm text-muted truncate">{user.email}</p>}
            </div>
          </div>
        ) : (
          <div className="mb-6 pr-8">
            <h2 className="text-xl font-semibold text-white mb-1">Welcome to MovieHub</h2>
            <p className="text-sm text-muted mb-4">Sign in to save titles and pick up where you left off.</p>
            <div className="grid grid-cols-2 gap-3">
              <Button to="/login" icon={<LogIn size={16} aria-hidden="true" />}>Sign In</Button>
              <Button to="/signup" variant="outline">Sign Up</Button>
            </div>
          </div>
        )}
        <ul className="flex flex-col gap-1">
          {[
            { to: '/movies', label: 'Movies', icon: <Film size={18} aria-hidden="true" /> },
            { to: '/tv', label: 'TV Shows', icon: <Tv size={18} aria-hidden="true" /> },
            { to: '/mylist', label: `My List${libraryCount ? ` (${libraryCount})` : ''}`, icon: <Bookmark size={18} aria-hidden="true" /> },
            { to: '/about', label: 'About', icon: <Info size={18} aria-hidden="true" /> },
            owner && { to: '/admin', label: 'Admin', icon: <ShieldCheck size={18} aria-hidden="true" /> },
          ].filter(Boolean).map((l) => (
            <li key={l.to}>
              <Link to={l.to} onClick={() => setShowAccount(false)} className="flex items-center gap-3 rounded-control px-3 py-3 text-white hover:bg-white/10">
                {l.icon} {l.label}
              </Link>
            </li>
          ))}
        </ul>
        {user && (
          <Button variant="outline" onClick={handleSignOut} className="w-full mt-6" icon={<LogOut size={16} aria-hidden="true" />}>
            Sign out
          </Button>
        )}
      </Modal>
    </>
  );
};

export default Navbar;
