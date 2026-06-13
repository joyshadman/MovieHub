import React, { useState, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Search, LogOut, Play, X, ShieldCheck, Home, 
  LayoutGrid, Info, ChevronDown, Bookmark, Menu 
} from 'lucide-react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signInWithRedirect, signOut, getRedirectResult  } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { profileImgAttrs, uiAvatarsFallback } from '../utils/avatarUrls';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [libraryCount, setLibraryCount] = useState(0);
  
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Detect scroll to swap between transparent and glassy modes
       getRedirectResult(auth)
      .then((result) => {
        if (result?.user) setShowAuthModal(false);
      })
      .catch(console.error);
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    let unsubWatchlist = () => {};

    const unsubscribe = auth.onAuthStateChanged((u) => {
      unsubWatchlist();
      unsubWatchlist = () => {};
      setLibraryCount(0);
      setUser(u);

      if (u) {
        setShowAuthModal(false);
        const watchlistRef = doc(db, "watchlists", u.uid);
        unsubWatchlist = onSnapshot(watchlistRef, (docSnap) => {
          if (docSnap.exists()) setLibraryCount(docSnap.data().items?.length || 0);
          else setLibraryCount(0);
        });
      }
    });

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      unsubWatchlist();
      unsubscribe();
    };
  }, []);

const signIn = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        console.error('Sign in failed:', redirectErr);
      }
    } else {
      console.error(err);
    }
  }
};
  const handleSignOut = async () => {
    await signOut(auth);
    setShowDropdown(false);
    setShowMobileMenu(false);
    navigate('/');
  };

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={16} /> },
    { name: 'Categories', path: '/categories', icon: <LayoutGrid size={16} /> },
    { name: 'About', path: '/about', icon: <Info size={16} /> },
  ];

  const dropdownVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
    exit: { opacity: 0, y: 4, transition: { duration: 0.12 } },
  };

  return (
    <>
      {/* FIXED WRAPPER */}
      <div className={`fixed top-0 left-0 right-0 z-[130] transition-all duration-500 pointer-events-none 
        ${isScrolled ? 'pt-2' : 'pt-4'}`}>
        
        <div className="flex justify-center px-4 w-full">
          <nav
            className={`
              pointer-events-auto flex items-center justify-between gap-4 px-5 py-2.5 rounded-[2.5rem] 
              transition-all duration-300 border border-white/10
              ${isScrolled 
                ? 'w-full md:w-[95%] lg:w-[85%] bg-black/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                : 'w-full md:w-[90%] lg:w-[75%] bg-white/[0.02] backdrop-blur-md'
              }
            `}
          >
            {/* LOGO */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="bg-red-600/20 backdrop-blur-xl p-2.5 rounded-2xl border border-red-600/30 group-hover:bg-red-600 transition-all duration-500 shadow-lg shadow-red-600/20">
                <Play size={18} fill="white" className="text-white" />
              </div>
              <h1 className="text-[14px] font-black italic tracking-tighter text-white uppercase block">
                MOVIE<span className="text-red-600">HUB</span>
              </h1>
            </Link>

            {/* DESKTOP NAVIGATION */}
            <div className="hidden md:flex items-center bg-white/[0.03] backdrop-blur-2xl rounded-full p-1 border border-white/10">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                    ${isActive 
                      ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'}
                  `}
                >
                  {item.name}
                </NavLink>
              ))}
            </div>

            {/* SEARCH TRIGGER */}
            <div 
              className="flex-1 max-w-[240px] hidden lg:block group cursor-pointer" 
              onClick={() => navigate('/search')}
            >
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-red-600 transition-colors" size={14} />
                <div className="w-full bg-white/[0.02] border border-white/10 rounded-full py-2 pl-10 pr-4 text-[10px] text-white/30 transition-all group-hover:bg-white/[0.08] backdrop-blur-xl font-black uppercase tracking-widest">
                  Quick Search
                </div>
              </div>
            </div>

            {/* USER ACTIONS */}
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => navigate('/search')} className="lg:hidden p-3 bg-white/5 rounded-full border border-white/10 text-white hover:bg-red-600 transition-all">
                <Search size={18} />
              </button>

              {user ? (
                <div className="relative hidden md:block" ref={dropdownRef}>
                  <button 
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 p-1 pr-3 bg-white/[0.03] border border-white/10 rounded-full hover:bg-white/10 transition-all backdrop-blur-md active:scale-[0.98]"
                  >
                    <img
                      src={user.photoURL}
                      alt="user"
                      className="w-8 h-8 rounded-full border border-white/20 object-cover"
                      {...profileImgAttrs}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = uiAvatarsFallback(user.displayName || user.email || 'User');
                      }}
                    />
                    <ChevronDown size={14} className={`text-white/40 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showDropdown && (
                      <Motion.div 
                        variants={dropdownVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="absolute top-full right-0 mt-4 w-60 bg-black/80 backdrop-blur-[50px] border border-white/10 rounded-[2.5rem] p-3 shadow-2xl z-[150] overflow-hidden"
                      >
                        <div className="p-5 border-b border-white/5 mb-2">
                          <p className="text-[9px] font-black uppercase text-red-600 tracking-widest mb-1">Authenticated</p>
                          <p className="text-xs font-black text-white truncate">{user.displayName}</p>
                        </div>
                        <Link to="/mylist" onClick={() => setShowDropdown(false)} className="flex items-center justify-between w-full p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all">
                          <span className="flex items-center gap-3"><Bookmark size={16} className="text-red-600" /> My Library</span>
                          {libraryCount > 0 && <span className="bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-full">{libraryCount}</span>}
                        </Link>
                        <button onClick={handleSignOut} className="flex items-center gap-3 w-full p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all">
                          <LogOut size={16} /> Disconnect
                        </button>
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)} className="hidden md:block bg-red-600 text-white px-7 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 hover:bg-white hover:text-black transition-all">
                  Sign In
                </button>
              )}

              <button onClick={() => setShowMobileMenu(true)} className="md:hidden p-3 bg-white/5 rounded-full border border-white/10 text-white">
                <Menu size={18} />
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* MOBILE MENU DRAWER */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <Motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm md:hidden"
            />
            <Motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-y-0 right-0 w-[85%] z-[210] bg-[#050505]/95 backdrop-blur-md border-l border-white/10 p-8 flex flex-col md:hidden"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                  <Play size={18} className="text-red-600" fill="currentColor" />
                  <span className="font-black text-white italic text-sm tracking-tighter uppercase">Nexus Portal</span>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="p-3 bg-white/5 rounded-full text-white hover:bg-red-600 transition-all"><X size={20}/></button>
              </div>

              {user ? (
                <div className="flex items-center gap-4 p-5 bg-white/5 rounded-[2.5rem] border border-white/10 mb-8">
                  <img
                    src={user.photoURL}
                    className="w-12 h-12 rounded-full border-2 border-red-600 object-cover"
                    alt=""
                    {...profileImgAttrs}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = uiAvatarsFallback(user.displayName || user.email || 'User');
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">{user.displayName}</span>
                    <span className="text-[8px] font-bold text-red-600 uppercase tracking-tighter">Verified Node</span>
                  </div>
                </div>
              ) : (
                <button onClick={() => {setShowAuthModal(true); setShowMobileMenu(false);}} className="w-full p-5 bg-red-600 text-white rounded-[2.5rem] text-[10px] font-black uppercase mb-8 shadow-xl shadow-red-600/20">Authorize Access</button>
              )}

              <div className="flex flex-col gap-2">
                {navItems.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setShowMobileMenu(false)} className="flex items-center gap-4 p-5 text-[11px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                    {item.icon} {item.name}
                  </Link>
                ))}
                {user && (
                  <Link to="/mylist" onClick={() => setShowMobileMenu(false)} className="flex items-center justify-between p-5 text-[11px] font-black uppercase tracking-[0.3em] text-red-500 hover:bg-red-500/5 rounded-2xl transition-all">
                    <span className="flex items-center gap-4"><Bookmark size={16}/> My Library</span>
                    {libraryCount > 0 && <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-lg">{libraryCount}</span>}
                  </Link>
                )}
              </div>

              {user && (
                <div className="mt-auto">
                  <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-4 p-5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-red-500 rounded-[2.5rem] border border-white/5">
                    <LogOut size={16}/> Terminate Session
                  </button>
                </div>
              )}
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AUTH MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => setShowAuthModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <Motion.div 
              initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-sm bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-[3.5rem] p-10 text-center shadow-2xl overflow-hidden"
            >
              <div className="bg-red-600/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-600/30">
                <ShieldCheck size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-black italic uppercase text-white mb-2 tracking-tighter">System Access</h2>
              <p className="text-white/30 text-[10px] uppercase font-bold mb-10 tracking-[0.3em]">Encrypted Authentication Required</p>
              <button 
                onClick={signIn}
                className="w-full flex items-center justify-center gap-4 bg-white text-black py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-red-600 hover:text-white transition-all shadow-xl"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="" />
                Sign in with Google
              </button>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;