import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { 
  Github, Cpu, Rocket, Database, 
  Terminal, Sparkles, Globe, ArrowUpRight,
  Code2, Layers, Zap, Smartphone, ChevronRight
} from 'lucide-react';

const About = () => {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const { scrollYProgress } = useScroll();
  
  // High-performance scroll tracking
  const yHero = useTransform(scrollYProgress, [0, 0.2], [0, -50]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  useEffect(() => {
    fetch('https://api.github.com/users/joyshadman')
      .then(res => res.json())
      .then(data => setAvatarUrl(data.avatar_url + '&s=600'))
      .catch(() => setAvatarUrl("https://github.com/joyshadman.png"));
  }, []);

  // 3D Tilt Physics for the Profile Section
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 120, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 120, damping: 25 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const cardVariants = {
    hidden: { y: 60, opacity: 0, scale: 0.95 },
    visible: { 
      y: 0, 
      opacity: 1, 
      scale: 1, 
      transition: { duration: 1, ease: [0.19, 1, 0.22, 1] } 
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020202] text-white selection:bg-red-600/40 overflow-x-hidden pt-10">
      
      {/* RADIANT BACKDROP */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-red-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-zinc-900/40 rounded-full blur-[120px]" />
      </div>

      {/* HERO SECTION */}
      <motion.section 
        style={{ y: yHero, opacity: opacityHero }}
        className="relative z-10 pt-32 pb-20 px-6"
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-600/10 border border-red-600/20 mb-10 backdrop-blur-xl"
          >
            <Sparkles size={14} className="text-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">Full Stack Developer</span>
          </motion.div>
          
          <h1 className="text-7xl md:text-[13rem] font-black italic uppercase tracking-tighter leading-[0.75] mb-8">
            JOY <span className="text-red-600 text-glow">SHADMAN.</span>
          </h1>
          <p className="max-w-xl text-white/30 text-[10px] md:text-xs font-bold uppercase tracking-[0.6em] leading-relaxed">
            Crafting the next generation of web applications with precision and speed.
          </p>
        </div>
      </motion.section>

      {/* BENTO CONTENT GRID */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 pb-32"
      >
        
        {/* PROFILE REVEAL CARD */}
        <motion.div 
          variants={cardVariants}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { x.set(0); y.set(0); }}
          className="md:col-span-12 lg:col-span-8 bg-zinc-900/20 backdrop-blur-3xl border border-white/5 rounded-[4rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-16 group relative overflow-hidden"
          style={{ perspective: 1000 }}
        >
          <motion.div 
            style={{ rotateX, rotateY }}
            className="relative w-64 h-64 md:w-80 md:h-80 shrink-0"
          >
            <div className="absolute inset-0 bg-red-600 rounded-[3.5rem] rotate-6 group-hover:rotate-12 transition-transform duration-700 opacity-20 blur-2xl" />
            <div className="relative h-full w-full bg-zinc-800 rounded-[3.5rem] border border-white/10 p-3 overflow-hidden shadow-2xl">
              <img 
                src={avatarUrl || "https://github.com/joyshadman.png"} 
                className="w-full h-full object-cover rounded-[2.8rem] filter grayscale group-hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100"
                alt="Joy Shadman"
              />
            </div>
          </motion.div>

          <div className="relative z-10 text-center md:text-left">
            <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-red-600 mb-6">Profile Summary</h3>
            <p className="text-lg md:text-2xl font-bold text-white/90 leading-relaxed italic uppercase tracking-tight mb-6">
              "I build interfaces that feel alive and backends that never sleep."
            </p>
            <p className="text-white/40 text-sm font-medium leading-loose max-w-md">
              As a **Full Stack Developer**, I bridge the gap between complex logic and premium user experience. 
              My stack is focused on React, Firebase, and high-performance animations, ensuring every 
              line of code contributes to a world-class digital product.
            </p>
          </div>
        </motion.div>

        {/* PROJECT BREAKDOWN CARD */}
        <motion.div variants={cardVariants} className="md:col-span-12 bg-zinc-900/20 backdrop-blur-3xl border border-white/5 rounded-[4rem] p-10 md:p-16 overflow-hidden relative group">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-6">
                 <div className="h-2 w-10 bg-red-600" />
                 <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-red-600">The Movie Hub Project</h3>
              </div>
              <p className="text-white/50 text-sm md:text-base font-medium leading-relaxed mb-10">
                **Movie Hub** is more than a database; it’s a high-performance streaming discovery tool. 
                Utilizing the **TMDB API**, I engineered a system that handles thousands of movie entries 
                with real-time filtering, instant search, and a glassy, animated UI that stays fluid on 
                all devices.
              </p>
              
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: <Globe size={16} />, label: "TMDB API", sub: "Data Orchestration" },
                  { icon: <Database size={16} />, label: "Firebase", sub: "User Environments" },
                  { icon: <Zap size={16} />, label: "Motion", sub: "60FPS Physics" }
                ].map((tech, idx) => (
                  <div key={idx} className="px-6 py-4 bg-white/5 border border-white/10 rounded-3xl hover:border-red-600/50 transition-all">
                    <div className="text-red-600 mb-2">{tech.icon}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest">{tech.label}</div>
                    <div className="text-[8px] text-white/30 uppercase mt-1">{tech.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2 relative h-full min-h-[300px] bg-red-600 rounded-[3rem] p-1 flex flex-col items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-black/20" />
               <Rocket size={120} className="text-white mb-6 group-hover:-translate-y-4 group-hover:translate-x-4 transition-transform duration-1000 ease-out" />
               <h4 className="text-3xl font-black italic uppercase tracking-tighter relative z-10 text-center">Production <br /> Grade Build</h4>
            </div>
          </div>
        </motion.div>

        {/* REPOSITORY ACCESS */}
        <motion.div variants={cardVariants} className="md:col-span-12 lg:col-span-4 bg-red-600 rounded-[4rem] p-10 flex flex-col justify-between shadow-2xl shadow-red-600/30 group cursor-pointer">
           <Github size={40} className="text-white" />
           <div>
              <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-4 leading-none">Open <br />Source.</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-8">github.com/joyshadman</p>
              <a href="https://github.com/joyshadman" target="_blank" className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">
                Explore Code <ArrowUpRight size={14} />
              </a>
           </div>
        </motion.div>

      </motion.div>

      {/* MINIMALIST FOOTER */}
      <footer className="relative z-10 border-t border-white/5 bg-[#020202] py-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
          <div className="space-y-2">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter">Joy <span className="text-red-600">Shadman</span></h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/10">Full Stack Developer © 2026</p>
          </div>
          <div className="flex gap-4">
            <a href="https://github.com/joyshadman" target="_blank" className="p-4 bg-zinc-900 border border-white/5 rounded-[2rem] hover:text-red-600 hover:border-red-600/40 transition-all">
                <Github size={24} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;