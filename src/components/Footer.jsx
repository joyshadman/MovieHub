import React from 'react';
import { motion } from 'framer-motion';
import { Play, Github, Globe, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Sub-categories mirrored from Categories.jsx
  const subCategories = [
    { name: 'Bollywood', id: 'bollywood' },
    { name: 'Bangla', id: 'bangla' },
    { name: 'Anime', id: 'anime' },
    { name: 'Action', id: 28 },
    { name: 'Sci-Fi', id: 878 },
    { name: 'Horror', id: 27 }
  ];

  return (
    <footer className="relative mt-20 pb-12 pt-24 px-6 md:px-12 border-t border-white/5 bg-[#080808]/40 backdrop-blur-xl overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[1px] bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-600/5 blur-[120px] rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 mb-20">
          
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6 group cursor-pointer">
              <div className="bg-red-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                <Play size={18} fill="white" className="text-white" />
              </div>
              <h1 className="text-lg font-black italic tracking-tighter text-white uppercase">
                MOVIE<span className="text-red-600"> HUB</span>
              </h1>
            </Link>
            <p className="text-white/40 text-xs font-medium leading-relaxed max-w-[200px]">
              The next generation of cinematic streaming. Experience ultimate immersion with 4K HDR technology.
            </p>
            <div className="flex gap-4 mt-8">
              <motion.a
                whileHover={{ y: -3, color: '#dc2626' }}
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/5 rounded-full border border-white/10 text-white/40 transition-colors"
              >
                <Github size={16} />
              </motion.a>
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em] mb-6">Navigation</h3>
            <ul className="space-y-4">
              {[
                { name: "Trending", path: "/" },
                { name: "My List", path: "/mylist" },
                { name: "Search", path: "/search" },
                { name: "Categories", path: "/categories" },
                { name: "About Me", path: "/about" }
              ].map((link, i) => (
                <li key={i}>
                  <motion.div whileHover={{ x: 5 }}>
                    <Link to={link.path} className="text-white/40 hover:text-white text-xs font-bold transition-colors block uppercase tracking-tighter">
                      {link.name}
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories Column */}
          <div>
            <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em] mb-6">Explore</h3>
            <ul className="grid grid-cols-1 gap-4">
              {subCategories.map((cat, i) => (
                <li key={i}>
                  <motion.div whileHover={{ x: 5 }}>
                    <Link to="/categories" className="text-white/40 hover:text-white text-xs font-bold transition-colors block uppercase tracking-tighter">
                      {cat.name}
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-wrap justify-center gap-8 opacity-40">
            {["4K HDR", "DOLBY ATMOS", "SECURE SYNC"].map(text => (
              <div key={text} className="flex items-center gap-2">
                <Shield size={10} className="text-red-600" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center md:items-end">
             <p className="text-[9px] font-black text-white/10 uppercase tracking-[1em] mb-2">
                Hub X • Edition {currentYear}
             </p>
             <div className="flex items-center gap-2 text-white/20 text-[9px] font-bold uppercase tracking-widest">
                <Globe size={10} />
                <span>Global Distributed Network</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;