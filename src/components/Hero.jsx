import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Shield, Zap, Globe, Play, ArrowUpRight } from 'lucide-react';

const Hero = ({ onSearchClick }) => {
  const [index, setIndex] = useState(0);
  const containerRef = useRef(null);

  const slides = useMemo(() => [
    {
      id: 'hub-1',
      title: "MovieHub",
      subtitle: "The Next Generation of Cinematic Streaming",
      backdrop: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070",
      overview: "Experience breathtaking 4K HDR content from around the globe. MovieHub brings the theater directly to your fingertips with zero latency and encrypted streaming nodes.",
      tag: "Ultra HD"
    },
    {
      id: 'hub-2',
      title: "Unlimited",
      subtitle: "Boundless Entertainment. No Compromise.",
      backdrop: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=2070",
      overview: "Access a massive library of award-winning series, blockbuster movies, and exclusive documentaries. Anytime. Anywhere.",
      tag: "Trending"
    }
  ], []);

  // Parallax scroll logic
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 500], [0, 150]);
  const opacityFade = useTransform(scrollY, [0, 400], [1, 0]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = slides[index];

  return (
    <div ref={containerRef} className="relative h-[100svh] w-full overflow-hidden bg-[#020202]">
      
      {/* BACKGROUND PHYSICS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-0"
        >
          <motion.div 
            style={{ y: yParallax }}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10s] ease-linear"
            style={{ backgroundImage: `url(${current.backdrop})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020202] via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* CONTENT LAYER */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full px-6 md:px-12">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              style={{ opacity: opacityFade }}
            >
              {/* TAG */}
              <motion.div 
                variants={{ hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1 } }}
                className="flex items-center gap-4 mb-6"
              >
                <span className="px-4 py-1.5 bg-red-600 rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-white shadow-2xl shadow-red-600/40">
                  {current.tag}
                </span>
                <div className="h-[1px] w-12 bg-white/20" />
                <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em]">Cinema Grade</span>
              </motion.div>

              {/* TITLE */}
              <motion.h1 
                variants={{ hidden: { filter: "blur(20px)", opacity: 0, y: 30 }, visible: { filter: "blur(0px)", opacity: 1, y: 0 } }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-7xl md:text-[10rem] lg:text-[12rem] font-black italic uppercase tracking-tighter text-white mb-2 leading-[0.8]"
              >
                {current.title}
              </motion.h1>

              <motion.h2 
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-red-600 mb-8"
              >
                {current.subtitle}
              </motion.h2>

              <motion.p 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="text-white/40 text-sm md:text-lg leading-relaxed max-w-xl mb-12 font-bold uppercase tracking-widest"
              >
                {current.overview}
              </motion.p>

              {/* BUTTONS */}
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="flex flex-wrap gap-5"
              >
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: "#fff", color: "#000" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSearchClick}
                  className="flex items-center gap-4 bg-white/10 backdrop-blur-3xl border border-white/20 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all"
                >
                  <Search size={18} /> Discover Content
                </motion.button>
                
                {/* LINK TO ABOUT PAGE */}
                <Link to="/about">
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.05)" }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-4 bg-transparent border border-white/10 text-white/80 px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px]"
                  >
                    The Developer <ArrowUpRight size={18} className="text-red-600" />
                  </motion.button>
                </Link>
              </motion.div>

              {/* STATUS SPECS */}
              <motion.div 
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 0.3 } }}
                className="mt-16 flex gap-8"
              >
                {[
                  { icon: <Shield size={14} />, text: "Encrypted" },
                  { icon: <Zap size={14} />, text: "60 FPS" },
                  { icon: <Globe size={14} />, text: "Global" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white">
                    {item.icon} {item.text}
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* STEP INDICATOR */}
      <div className="absolute bottom-12 right-12 z-40 flex items-center gap-4">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <motion.div 
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-700 cursor-pointer ${
                index === i ? 'w-12 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : 'w-3 bg-white/10'
              }`}
            />
          ))}
        </div>
        <span className="text-white/20 text-[10px] font-black font-mono">0{index + 1}</span>
      </div>

      <div className="absolute bottom-0 w-full h-64 bg-gradient-to-t from-[#020202] to-transparent z-30 pointer-events-none" />
    </div>
  );
};

export default Hero;