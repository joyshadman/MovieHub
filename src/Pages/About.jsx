/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { 
  Github, Cpu, Rocket, Database, 
  Terminal, Sparkles, Globe, ArrowUpRight,
  Code2, Layers, Zap, Smartphone, ChevronRight,
  Plus, Trash2, Edit3, Save, X, Activity, Clock, ShieldCheck, Users, Eye, Power,
  Monitor, HardDrive, Box, GitBranch
} from 'lucide-react';
import { auth, db } from '../components/firebase'; 
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, serverTimestamp, setDoc 
} from 'firebase/firestore';

const About = () => {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [siteUsers, setSiteUsers] = useState([]); 
  const [newUpdate, setNewUpdate] = useState("");
  const [newVersion, setNewVersion] = useState("v1.0");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { scrollYProgress } = useScroll();
  const user = auth.currentUser;

  // 1. TRACK CURRENT USER STATUS & ACTIVITY
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const updateStatus = (online) => {
      setDoc(userRef, {
        displayName: user.displayName || "Anonymous",
        email: user.email,
        photoURL: user.photoURL,
        lastActive: serverTimestamp(),
        isOnline: online,
        watching: "Portfolio Core / About" 
      }, { merge: true });
    };

    updateStatus(true);
    return () => updateStatus(false);
  }, [user]);

  // 2. FETCH DATA (Updates & Personnel)
  useEffect(() => {
    if (user && user.email === "joyshadman@gmail.com") setIsAdmin(true);

    fetch('https://api.github.com/users/joyshadman')
      .then(res => res.json())
      .then(data => setAvatarUrl(data.avatar_url + '&s=600'))
      .catch(() => setAvatarUrl("https://github.com/joyshadman.png"));

    const qUpdates = query(collection(db, "site_updates"), orderBy("timestamp", "desc"));
    const unsubUpdates = onSnapshot(qUpdates, (snapshot) => {
      setUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let unsubUsers = () => {};
    if (user?.email === "joyshadman@gmail.com") {
      const qUsers = query(collection(db, "users"), orderBy("lastActive", "desc"));
      unsubUsers = onSnapshot(qUsers, (snapshot) => {
        setSiteUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubUpdates();
      unsubUsers();
    };
  }, [user]);

  // --- HANDLERS ---
  const handleAddUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdate.trim()) return;
    try {
      await addDoc(collection(db, "site_updates"), {
        text: newUpdate,
        version: newVersion,
        timestamp: serverTimestamp(),
      });
      setNewUpdate("");
    } catch (err) { console.error(err); }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Banish this user from the records?")) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  // --- Animation Hooks ---
  const yHero = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 100, damping: 30 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    rotateX.set((e.clientY - rect.top) / rect.height - 0.5);
    rotateY.set((e.clientX - rect.left) / rect.width - 0.5);
  };

  const skills = [
    { name: "Frontend Architecture", icon: <Monitor size={20}/>, tools: "React, Next.js, Tailwind, Framer" },
    { name: "Backend Infrastructure", icon: <HardDrive size={20}/>, tools: "Node.js, Express, Firebase, MongoDB" },
    { name: "System Optimization", icon: <Cpu size={20}/>, tools: "Linux, Kernel Tuning, Btrfs, Shell" },
    { name: "DevOps & Flow", icon: <GitBranch size={20}/>, tools: "Vercel, Git, Docker, Ollama AI" }
  ];

  return (
    <div className="relative min-h-screen bg-[#020202] text-white selection:bg-red-600/40 overflow-x-hidden pt-20 pb-20 font-sans">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-zinc-900/20 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        
        {/* HERO SECTION */}
        <motion.section style={{ y: yHero }} className="text-center mb-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-2xl mb-8">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/60">System Core {updates[0]?.version || "v2.4"}</span>
          </motion.div>
          <h1 className="text-8xl md:text-[14rem] font-black italic uppercase tracking-tighter leading-none mb-4">
            JOY <span className="text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,0.3)]">SHADMAN.</span>
          </h1>
          <p className="text-white/20 text-xs font-bold uppercase tracking-[0.8em]">Full Stack Engineering • Creative UI/UX Architect</p>
        </motion.section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-20">
          
          {/* PROFILE ARCHITECTURE */}
          <motion.div 
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { rotateX.set(0); rotateY.set(0); }}
            className="md:col-span-12 lg:col-span-7 group bg-white/[0.02] border border-white/5 rounded-[4rem] p-12 md:p-20 relative overflow-hidden backdrop-blur-3xl"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-16">
              <motion.div 
                style={{ 
                  rotateX: useTransform(rotateX, [-0.5, 0.5], [10, -10]), 
                  rotateY: useTransform(rotateY, [-0.5, 0.5], [-10, 10]) 
                }} 
                className="relative shrink-0"
              >
                <div className="absolute inset-0 bg-red-600/20 blur-3xl scale-125 rounded-full" />
                <div className="relative w-72 h-72 rounded-[4rem] border border-white/10 p-2 bg-zinc-900 overflow-hidden shadow-2xl">
                  <img src={avatarUrl || "https://github.com/joyshadman.png"} className="w-full h-full object-cover rounded-[3.5rem] grayscale group-hover:grayscale-0 transition-all duration-700" alt="Joy" />
                </div>
              </motion.div>
              <div className="flex-1 space-y-6 text-center md:text-left">
                <h3 className="text-red-600 text-[10px] font-black uppercase tracking-[0.6em]">The Architect</h3>
                <h2 className="text-4xl font-black italic uppercase leading-tight tracking-tighter">
                  Engineering with <span className="text-red-600">Zero Compromise.</span>
                </h2>
                <div className="space-y-4">
                   <p className="text-white/60 text-sm leading-loose font-medium">
                     I am a Full-Stack Developer specializing in the MERN stack and high-performance Linux environments. 
                     I build digital ecosystems where performance meets aesthetic brutality—prioritizing glassy transparency and low-latency interactions.
                   </p>
                   <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {['MERN Stack', 'Next.js', 'Framer Motion', 'Linux Poweruser'].map(tag => (
                        <span key={tag} className="text-[9px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 uppercase font-black">{tag}</span>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* SYSTEM LOGS */}
          <motion.div className="md:col-span-12 lg:col-span-5 bg-zinc-900/40 border border-white/10 rounded-[4rem] flex flex-col backdrop-blur-3xl overflow-hidden shadow-2xl">
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <div>
                 <h3 className="text-[11px] font-black uppercase tracking-[0.5em]">System_Logs</h3>
                 <p className="text-[9px] text-red-600 font-bold uppercase mt-1">Version History</p>
               </div>
               <Activity className="text-red-600 animate-pulse" size={20} />
            </div>

            {isAdmin && (
              <div className="p-10 bg-red-600/5 border-b border-red-600/10 space-y-4">
                <input value={newVersion} onChange={(e) => setNewVersion(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:border-red-600/50" />
                <textarea value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-3xl p-6 text-sm outline-none h-24 focus:border-red-600/50 resize-none transition-all" />
                <button onClick={handleAddUpdate} className="w-full bg-red-600 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all">Deploy Update</button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto max-h-[500px] p-8 space-y-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {updates.map((update) => (
                  <motion.div key={update.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="group bg-white/5 border border-white/5 rounded-[2.5rem] p-8">
                    <div className="flex justify-between mb-4">
                      <span className="px-3 py-1 bg-red-600/20 text-red-500 rounded-full text-[9px] font-black uppercase tracking-tighter border border-red-600/20">{update.version}</span>
                      {isAdmin && <button onClick={() => deleteDoc(doc(db, "site_updates", update.id))} className="text-white/20 hover:text-red-600"><Trash2 size={14} /></button>}
                    </div>
                    <p className="text-sm font-medium text-white/60">"{update.text}"</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* --- TECHNICAL ARSENAL SECTION --- */}
        <section className="mb-40">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
            <div className="space-y-4">
               <h3 className="text-red-600 text-[10px] font-black uppercase tracking-[0.6em]">Capabilities</h3>
               <h2 className="text-6xl font-black italic uppercase tracking-tighter">The <span className="text-red-600">Arsenal.</span></h2>
            </div>
            <p className="max-w-md text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed">Technical stack optimized for rapid deployment and high-fidelity visuals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill, index) => (
              <motion.div 
                key={index}
                whileHover={{ y: -10 }}
                className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] hover:bg-red-600/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-red-600 group-hover:text-white transition-all text-red-600">
                  {skill.icon}
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest mb-4">{skill.name}</h4>
                <p className="text-[10px] text-white/30 font-bold uppercase leading-loose">{skill.tools}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* --- ADMIN: COMMAND CENTER --- */}
        {isAdmin && (
          <motion.section 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="mb-40 bg-white/[0.02] border border-white/5 rounded-[4rem] overflow-hidden backdrop-blur-3xl shadow-[0_0_50px_rgba(220,38,38,0.05)]"
          >
            <div className="p-10 md:p-16 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-red-600 text-[10px] font-black uppercase tracking-[0.6em] mb-2">Command Center</h3>
                <h2 className="text-5xl font-black italic uppercase tracking-tighter">Live <span className="text-red-600">Personnel.</span></h2>
              </div>
              <div className="flex items-center gap-4 bg-black/40 px-8 py-4 rounded-3xl border border-white/5">
                <Users className="text-red-600" size={24} />
                <span className="text-3xl font-black tracking-tighter">{siteUsers.length}</span>
                <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">Active Entities</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-10 gap-6">
              <AnimatePresence>
                {siteUsers.map((u) => (
                  <motion.div 
                    key={u.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-zinc-900/60 border border-white/5 rounded-[3rem] p-8 hover:border-red-600/30 transition-all group"
                  >
                    <div className="flex items-center gap-5 mb-6">
                      <div className="relative">
                        <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} className="w-16 h-16 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all" alt="User" />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${u.isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`} />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-sm font-black uppercase tracking-tight truncate">{u.displayName}</h4>
                        <p className="text-[10px] text-white/30 truncate font-mono">{u.email}</p>
                      </div>
                    </div>

                    <div className="space-y-3 bg-black/30 p-5 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-white/40 tracking-widest">
                          <Eye size={12} className="text-red-600" /> Activity
                        </div>
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">{u.watching || "Idle"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-white/40 tracking-widest">
                          <Clock size={12} className="text-red-600" /> Pulse
                        </div>
                        <span className="text-[9px] font-bold text-white/60">
                           {u.lastActive?.toDate ? u.lastActive.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Syncing..."}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="w-full mt-6 py-4 bg-white/5 hover:bg-red-600/10 border border-white/5 hover:border-red-600/40 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all text-white/20 hover:text-red-600 flex items-center justify-center gap-2"
                    >
                      <Power size={14} /> Terminate Session
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}

        {/* --- FOOTER CTA --- */}

      </div>
    </div>
  );
};

export default About;