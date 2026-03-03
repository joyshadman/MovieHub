import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Search, LogOut, Play, X, 
  ShieldCheck, Home, LayoutGrid, Info, ChevronDown, 
  Bookmark, User, Menu
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) setShowAuthModal(false);
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      unsubscribe();
    };
  }, []);

  const handleSearchTrigger = () => {
    navigate('/search');
    setShowMobileMenu(false);
  };

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (err) {
      console.error(err);
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
    hidden: { opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' },
    visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, y: 5, scale: 0.98, filter: 'blur(10px)', transition: { duration: 0.15 } }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[130] p-4 flex justify-center pointer-events-none">
        <motion.nav 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className={`
            pointer-events-auto flex items-center justify-between gap-4 px-4 py-2 rounded-[2.5rem] 
            transition-all duration-700 border border-white/10
            ${isScrolled 
              ? 'w-full md:w-[95%] lg:w-[85%] bg-black/40 backdrop-blur-3xl shadow-2xl' 
              : 'w-full md:w-[90%] lg:w-[75%] bg-white/[0.01] backdrop-blur-md'
            }
          `}
        >
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-3 group shrink-0 ml-1">
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
                    ? 'bg-white/10 text-white shadow-xl' 
                    : 'text-white/30 hover:text-white hover:bg-white/5'}
                `}
              >
                {item.name}
              </NavLink>
            ))}
          </div>

          {/* SEARCH BAR (Desktop) */}
          <div className="flex-1 max-w-xs hidden md:block group cursor-pointer" onClick={handleSearchTrigger}>
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-red-600 transition-colors" size={14} />
              <div className="w-full bg-white/[0.02] border border-white/10 rounded-full py-2 pl-10 pr-4 text-[10px] text-white/20 transition-all group-hover:bg-white/[0.08] backdrop-blur-xl font-black uppercase tracking-widest">
                Search
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Search Icon */}
            <button onClick={handleSearchTrigger} className="md:hidden p-3 bg-white/5 rounded-full border border-white/10 text-white active:scale-90 transition-transform">
              <Search size={18} />
            </button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                {/* Profile Pic / Dropdown Toggle (Desktop) */}
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="hidden md:flex items-center gap-2 p-1 pr-3 bg-white/[0.03] border border-white/10 rounded-full hover:bg-white/10 transition-all backdrop-blur-2xl"
                >
                  <img src={user.photoURL} alt="user" className="w-8 h-8 rounded-full border border-white/20 shadow-lg" />
                  <ChevronDown size={14} className={`text-white/40 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </motion.button>

                {/* Mobile Menu Toggle */}
                <button 
                  onClick={() => setShowMobileMenu(true)}
                  className="md:hidden p-3 bg-white/5 rounded-full border border-white/10 text-white"
                >
                  <Menu size={18} />
                </button>

                {/* DESKTOP DROPDOWN MENU */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div 
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute top-full right-0 mt-4 w-60 bg-black/60 backdrop-blur-[40px] border border-white/10 rounded-[2rem] p-3 shadow-2xl z-[150] overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/5 mb-2">
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Identity</p>
                        <p className="text-xs font-black text-white truncate">{user.displayName}</p>
                      </div>
                      
                      <Link to="/mylist" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 w-full p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all group">
                        <Bookmark size={16} className="text-red-600" /> My Library
                      </Link>

                      <button onClick={handleSignOut} className="flex items-center gap-3 w-full p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all">
                        <LogOut size={16} /> Exit System
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="bg-red-600 text-white px-7 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all">Sign In</button>
            )}
          </div>
        </motion.nav>
      </div>

      {/* MOBILE DRAWER (Hamburger Menu) */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[80%] z-[210] bg-[#0a0a0a] border-l border-white/10 p-8 flex flex-col md:hidden"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                  <Play size={18} className="text-red-600" fill="currentColor" />
                  <span className="font-black text-white italic text-sm tracking-tighter">MH PORTAL</span>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="p-3 bg-white/5 rounded-full text-white"><X size={20}/></button>
              </div>

              {user && (
                <div className="flex items-center gap-4 p-5 bg-white/5 rounded-[2rem] border border-white/10 mb-8">
                  <img src={user.photoURL} className="w-12 h-12 rounded-full border border-white/20" alt="" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">{user.displayName}</span>
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Verified Node</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {navItems.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setShowMobileMenu(false)} className="flex items-center gap-4 p-5 text-[11px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                    {item.icon} {item.name}
                  </Link>
                ))}
                {user && (
                  <Link to="/library" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-4 p-5 text-[11px] font-black uppercase tracking-[0.3em] text-red-500 hover:bg-red-500/5 rounded-2xl transition-all">
                    <Bookmark size={16}/> My Library
                  </Link>
                )}
              </div>

              <div className="mt-auto">
                {user ? (
                  <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-4 p-5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 rounded-[2rem] border border-white/5">
                    <LogOut size={16}/> Disconnect Session
                  </button>
                ) : (
                  <button onClick={() => {setShowAuthModal(true); setShowMobileMenu(false);}} className="w-full p-5 bg-red-600 text-white rounded-[2rem] text-[10px] font-black uppercase shadow-xl">Initialize Access</button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AUTH MODAL (Google Sign In) */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a0a0a]/80 backdrop-blur-[60px] border border-white/10 rounded-[3.5rem] p-10 text-center shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent" />
              <div className="bg-red-600/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-600/30">
                <ShieldCheck size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-black italic uppercase text-white mb-2 tracking-tighter">Access Portal</h2>
              <p className="text-white/30 text-[10px] uppercase font-bold mb-10 tracking-[0.3em]">Authorized Personnel Only</p>
              <button 
                onClick={signIn}
                className="w-full flex items-center justify-center gap-4 bg-white text-black py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-xl"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="" />
                Continue with Google
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;