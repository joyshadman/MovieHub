import React, { useEffect, useMemo, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Play, Github, Monitor, HardDrive, Cpu, GitBranch, Trash2, Users, Power, Send,
  ShieldCheck, Eye, Clock, ExternalLink, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth, db } from '../components/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { profileImgAttrs, githubSizedAvatarUrl, dicebearAvatarUrl, uiAvatarsFallback } from '../utils/avatarUrls';
import { isLive, lastSeenLabel } from '../services/presence';
import Button from '../components/ui/Button';
import Modal, { ConfirmDialog } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/feedback';

// Page built from figma-desing/about-ui.md. The doc's own header and footer are left out on
// purpose: the site Navbar and Footer stay. Creator, site updates and the admin tracker are the
// existing About features, kept and restyled into the same editorial look.

const GITHUB_URL = 'https://github.com/joyshadman';
const HERO_IMG = 'https://images.unsplash.com/photo-1717915604557-94283edbcc1b?auto=format&fit=crop&w=2400&q=90';
const STORY_IMG = 'https://images.unsplash.com/photo-1688678004647-945d5aaf91c1?auto=format&fit=crop&w=1400&q=85';
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const VALUES = [
  { n: '01', title: 'Discovery with taste', body: 'Human curation meets smart recommendations, so every suggestion feels worth your time.' },
  { n: '02', title: 'Cinema without borders', body: 'Stories from every country, culture, and perspective belong on the same screen.' },
  { n: '03', title: 'Community first', body: 'Ratings, lists, and conversations turn watching into something we share together.' },
];

const SKILLS = [
  { name: 'Frontend Architecture', icon: Monitor, tools: 'React, Next.js, Tailwind, Framer' },
  { name: 'Backend Infrastructure', icon: HardDrive, tools: 'Node.js, Express, Firebase, MongoDB' },
  { name: 'System Optimization', icon: Cpu, tools: 'Linux, Kernel Tuning, Btrfs, Shell' },
  { name: 'DevOps & Flow', icon: GitBranch, tools: 'Vercel, Git, Docker, Ollama AI' },
];

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
const EYEBROW = 'text-[10px] font-bold uppercase tracking-[0.3em]';

// Restrained entrance from the design doc: fade and rise 18px over 900ms.
const Reveal = ({ as = 'div', delay = 0, className = '', children, ...rest }) => {
  const reduce = useReducedMotion();
  const Tag = Motion[as];
  return (
    <Tag
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
};

const About = ({ user: propUser }) => {
  const reduce = useReducedMotion();
  const user = propUser ?? auth.currentUser;
  const isAdmin = !!(user?.email && ADMIN_EMAILS.includes(user.email));
  const joyFallback = import.meta.env.VITE_GITHUB_AVATAR_URL || uiAvatarsFallback('Joy Shadman');

  const [showreel, setShowreel] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [visitorsError, setVisitorsError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [newUpdate, setNewUpdate] = useState('');
  const [newVersion, setNewVersion] = useState('v1.0');
  const [publishing, setPublishing] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  // Creator avatar from GitHub (falls back to initials art).
  useEffect(() => {
    let cancelled = false;
    fetch('https://api.github.com/users/joyshadman', { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('GitHub API error'))))
      .then((data) => { if (!cancelled) setAvatarUrl(data?.avatar_url ? githubSizedAvatarUrl(data.avatar_url, 400) : joyFallback); })
      .catch(() => { if (!cancelled) setAvatarUrl(joyFallback); });
    return () => { cancelled = true; };
  }, [joyFallback]);

  // Release notes: public feed.
  useEffect(() => {
    const q = query(collection(db, 'site_updates'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => setUpdates(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Updates feed error:', err));
  }, []);

  // Tracker (admins only): live list of visitor records written by services/presence.js.
  useEffect(() => {
    if (!isAdmin) return undefined;
    const q = query(collection(db, 'users'), orderBy('lastActive', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => { setVisitorsError(false); setVisitors(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); },
      (err) => { console.error('Visitor tracker error:', err); setVisitorsError(true); }
    );
    // "Online" depends on how long ago a visitor was seen, so re-check the clock regularly.
    const tick = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => { unsub(); clearInterval(tick); };
  }, [isAdmin]);

  const sortedVisitors = useMemo(
    () => [...visitors].sort((a, b) => Number(isLive(b, now)) - Number(isLive(a, now))),
    [visitors, now]
  );
  const onlineCount = visitors.filter((v) => isLive(v, now)).length;

  const handleAddUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdate.trim()) return;
    setPublishing(true);
    try {
      await addDoc(collection(db, 'site_updates'), { text: newUpdate, version: newVersion, timestamp: serverTimestamp() });
      setNewUpdate('');
      toast.success('Update published');
    } catch (err) {
      console.error(err);
      toast.error('Could not publish the update');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteUpdate = async (id) => {
    try {
      await deleteDoc(doc(db, 'site_updates', id));
      toast.success('Update deleted');
    } catch {
      toast.error('Could not delete the update');
    }
  };

  const handleDeleteUser = async () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      await deleteDoc(doc(db, 'users', pendingRemoval.id));
      toast.success('User record removed');
      setPendingRemoval(null);
    } catch {
      toast.error('Could not remove this user');
    } finally {
      setRemoving(false);
    }
  };

  const container = 'mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-16';

  return (
    <div id="top" className="font-body text-white">
      {/* 1. HERO */}
      <section id="about" aria-labelledby="about-title" className="relative flex min-h-[92svh] items-end overflow-hidden lg:items-center">
        <img src={HERO_IMG} alt="" className="absolute inset-0 h-full w-full object-cover object-center motion-safe:animate-kenburns" />
        <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/70 to-canvas/10" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-black/50" aria-hidden="true" />
        <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none" style={{ backgroundImage: GRAIN }} aria-hidden="true" />

        <div className={`${container} relative pb-16 pt-32 lg:py-32 flex items-end justify-between gap-10`}>
          <Reveal className="max-w-[760px]">
            <p className={`flex items-center gap-3 text-white/60 ${EYEBROW}`}>
              <span className="h-px w-8 bg-accent" aria-hidden="true" /> About MovieHub
            </p>
            <h1 id="about-title" className="mt-6 font-semibold text-[clamp(3.6rem,8vw,7.5rem)] leading-[0.92] tracking-[-0.065em]">
              Stories belong <span className="text-white/35">to everyone.</span>
            </h1>
            <p className="mt-7 max-w-[570px] text-[15px] md:text-base leading-7 text-muted">
              MovieHub is where film lovers discover what to watch next. From iconic classics to bold new voices, we bring
              every kind of story together in one beautifully curated home.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => scrollTo('story')}
                className={`group inline-flex h-12 items-center gap-3 rounded-full bg-white px-6 text-black hover:bg-white/90 motion-safe:transition-all motion-safe:active:scale-[0.97] ${EYEBROW} tracking-[0.2em]`}
              >
                Our story <ArrowRight size={16} className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setShowreel(true)}
                className={`group inline-flex h-12 items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] pl-2 pr-6 backdrop-blur-md hover:bg-white/[0.12] hover:border-white/30 motion-safe:transition-all motion-safe:active:scale-[0.97] ${EYEBROW} tracking-[0.2em]`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 motion-safe:transition-colors group-hover:bg-accent">
                  <Play size={13} className="ml-0.5 fill-white" aria-hidden="true" />
                </span>
                Watch showreel
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.25} as="dl" className="hidden xl:flex gap-10 border-l border-white/15 pl-10 pb-2">
            {[['190+', 'Countries'], ['40K+', 'Titles']].map(([v, l]) => (
              <div key={l} className="flex flex-col-reverse">
                <dt className={`mt-2 text-white/50 ${EYEBROW}`}>{l}</dt>
                <dd className="text-5xl font-semibold tracking-[-0.04em]">{v}</dd>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 2. OUR STORY */}
      <section id="story" aria-labelledby="story-title" className={`${container} scroll-mt-20 py-24 lg:py-32 grid gap-14 lg:grid-cols-2 lg:gap-20 items-center`}>
        <Reveal className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-accent/20 blur-3xl" aria-hidden="true" />
          <figure className="relative aspect-[4/5] overflow-hidden rounded-sheet border border-white/10">
            <img src={STORY_IMG} alt="A dark cinema auditorium lit by the projector screen" loading="lazy" className="h-full w-full object-cover grayscale-[35%] motion-safe:transition-transform duration-[1.5s] hover:scale-[1.03]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" aria-hidden="true" />
            <figcaption className={`absolute bottom-6 left-6 text-white/80 ${EYEBROW}`}>Built for the love of film</figcaption>
          </figure>
        </Reveal>
        <Reveal delay={0.1}>
          <p className={`text-accent-text ${EYEBROW}`}>Our story</p>
          <h2 id="story-title" className="mt-5 text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">
            More than a catalog.<br className="hidden md:block" /> A place to connect.
          </h2>
          <p className="mt-7 text-[15px] leading-8 text-muted">
            MovieHub began with a simple idea: finding a great film should feel as exciting as watching one. We combine
            thoughtful curation, intelligent discovery, and a global community to help every story find its audience.
          </p>
          <p className="mt-5 text-[15px] leading-8 text-muted">
            No endless searching. No soulless lists. Just cinema, presented with the care it deserves.
          </p>
          <blockquote className="mt-9 border-l-2 border-accent pl-6 text-xl font-medium leading-relaxed text-white/90">
            “We believe the right story can change your night, and sometimes, your life.”
          </blockquote>
        </Reveal>
      </section>

      {/* 3. VALUES */}
      <section id="values" aria-labelledby="values-title" className="scroll-mt-20 border-y border-white/10 bg-white/[0.025]">
        <div className={`${container} py-24 lg:py-28`}>
          <Reveal className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`text-accent-text ${EYEBROW}`}>What drives us</p>
              <h2 id="values-title" className="mt-5 text-4xl md:text-5xl font-semibold tracking-[-0.04em]">Made for movie people.</h2>
            </div>
            <p className="max-w-sm text-[15px] leading-7 text-muted lg:text-right">
              Every detail is designed to get you closer to the stories you love.
            </p>
          </Reveal>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-sheet border border-white/10 bg-white/10 md:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal as="li" key={v.n} delay={i * 0.1} className="group flex min-h-[280px] flex-col bg-[#0a0a0a] p-8 lg:p-10 motion-safe:transition-colors hover:bg-[#111114]">
                <span className="text-sm font-semibold text-white/30">{v.n}</span>
                <h3 className="mt-auto text-2xl font-semibold tracking-[-0.03em] motion-safe:transition-colors group-hover:text-accent-text">{v.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-muted">{v.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. CREATOR (existing feature, with the GitHub link) */}
      <section id="creator" aria-labelledby="creator-title" className={`${container} scroll-mt-20 py-24 lg:py-28`}>
        <Reveal className="relative overflow-hidden rounded-sheet border border-white/10 bg-card p-6 sm:p-10 lg:p-14 bg-[radial-gradient(ellipse_at_top_right,rgb(225_29_72/0.18),transparent_55%)]">
          <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-14 items-start">
            <img
              src={avatarUrl || joyFallback}
              alt="Joy Shadman"
              className="h-40 w-40 lg:h-60 lg:w-60 rounded-sheet object-cover border border-white/10 shadow-card"
              {...profileImgAttrs}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = joyFallback; }}
            />
            <div>
              <p className={`text-accent-text ${EYEBROW}`}>Made by</p>
              <h2 id="creator-title" className="mt-4 text-4xl md:text-5xl font-semibold tracking-[-0.04em]">Joy Shadman</h2>
              <p className="mt-2 text-sm text-white/50">Full Stack Engineer · UI and UX</p>
              <p className="mt-6 max-w-2xl text-[15px] leading-8 text-muted">
                I am a full stack developer specializing in the MERN stack and high performance Linux environments.
                I build products where performance meets polish, with smooth, low latency interactions.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['MERN Stack', 'Next.js', 'Framer Motion', 'Linux Poweruser'].map((tag) => (
                  <span key={tag} className="h-8 inline-flex items-center px-3.5 rounded-full border border-white/15 text-xs font-medium">{tag}</span>
                ))}
              </div>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-8 inline-flex items-center gap-4 rounded-panel border border-white/15 bg-white/[0.04] p-3 pr-5 hover:border-white/30 hover:bg-white/[0.08] motion-safe:transition-all"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-control bg-white text-black"><Github size={22} aria-hidden="true" /></span>
                <span>
                  <span className="block text-sm font-semibold">github.com/joyshadman</span>
                  <span className="block text-xs text-white/50">Code, projects and this site’s source</span>
                </span>
                <ExternalLink size={16} className="ml-2 text-white/50 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </div>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-panel border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {SKILLS.map(({ name, icon, tools }) => {
              const Icon = icon;
              return (
              <li key={name} className="bg-card p-6 motion-safe:transition-colors hover:bg-[#18181d]">
                <Icon size={20} className="text-accent-text" aria-hidden="true" />
                <h3 className="mt-4 text-sm font-semibold">{name}</h3>
                <p className="mt-1.5 text-sm text-muted">{tools}</p>
              </li>
              );
            })}
          </ul>
        </Reveal>
      </section>

      {/* 5. SITE UPDATES (existing feature) */}
      <section id="updates" aria-labelledby="updates-title" className={`${container} scroll-mt-20 pb-24 lg:pb-28 grid gap-8 lg:grid-cols-[1fr_380px]`}>
        <Reveal>
          <p className={`text-accent-text ${EYEBROW}`}>Changelog</p>
          <h2 id="updates-title" className="mt-4 mb-8 text-3xl md:text-4xl font-semibold tracking-[-0.04em]">Site updates</h2>
          {updates.length === 0 ? (
            <EmptyState title="No updates yet" message="Release notes will show up here." className="py-10" />
          ) : (
            <ol className="relative space-y-4 border-l border-white/10 pl-6">
              {updates.map((u) => (
                <li key={u.id} className="relative">
                  <span className="absolute -left-[29px] top-2 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-canvas" aria-hidden="true" />
                  <div className="rounded-panel border border-white/10 bg-card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex h-7 items-center rounded-full border border-accent/50 bg-accent/10 px-3 text-xs font-semibold">{u.version}</span>
                      <span className="flex items-center gap-3">
                        {u.timestamp?.toDate && <time className="text-xs text-muted">{u.timestamp.toDate().toLocaleDateString()}</time>}
                        {isAdmin && (
                          <button type="button" onClick={() => handleDeleteUpdate(u.id)} aria-label={`Delete update ${u.version}`} className="rounded-full p-1.5 text-muted hover:text-white hover:bg-white/10">
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        )}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/85">{u.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Reveal>

        {isAdmin && (
          <form onSubmit={handleAddUpdate} className="self-start rounded-panel border border-accent/30 bg-accent/5 p-5 space-y-4 lg:mt-[92px]">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-accent-text" aria-hidden="true" /> Publish an update</h3>
            <div>
              <label htmlFor="update-version" className="block text-sm text-white/85 mb-2">Version</label>
              <input id="update-version" value={newVersion} onChange={(e) => setNewVersion(e.target.value)} className="w-full h-11 rounded-control border border-line-strong bg-white/[0.06] px-4 text-sm focus:outline-none focus:border-accent-text" />
            </div>
            <div>
              <label htmlFor="update-text" className="block text-sm text-white/85 mb-2">What changed</label>
              <textarea id="update-text" value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} rows={4} className="w-full rounded-control border border-line-strong bg-white/[0.06] px-4 py-3 text-sm resize-none focus:outline-none focus:border-accent-text" />
            </div>
            <Button type="submit" className="w-full" loading={publishing} disabled={!newUpdate.trim()} icon={<Send size={16} aria-hidden="true" />}>Publish update</Button>
          </form>
        )}
      </section>

      {/* 6. ADMIN: LIVE VISITOR TRACKER */}
      {isAdmin && (
        <section id="tracker" aria-labelledby="tracker-title" className={`${container} scroll-mt-20 pb-24`}>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className={`text-accent-text ${EYEBROW}`}>Admin</p>
              <h2 id="tracker-title" className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Live visitors</h2>
              <p className="mt-2 text-xs text-white/50">Online means seen in the last 3 minutes. Updates live.</p>
            </div>
            <p className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm" aria-live="polite">
              <Users size={16} aria-hidden="true" /> {visitors.length} total •
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden="true" /> {onlineCount} online
              </span>
            </p>
          </div>
          {visitorsError ? (
            <EmptyState
              icon={<AlertTriangle size={26} aria-hidden="true" />}
              title="The tracker could not load"
              message="Firestore refused the read. Check that your account may read the users collection."
              className="py-10"
            />
          ) : sortedVisitors.length === 0 ? (
            <EmptyState title="No visitors yet" message="Signed in visitors will appear here." className="py-10" />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedVisitors.map((u) => {
                const live = isLive(u, now);
                return (
                  <li key={u.id} className={`rounded-panel border bg-card p-5 motion-safe:transition-colors ${live ? 'border-emerald-400/30' : 'border-white/10'}`}>
                    <div className="flex items-center gap-4">
                      <span className="relative shrink-0">
                        <img
                          src={u.photoURL || dicebearAvatarUrl(u.email || u.displayName || u.id)}
                          className="h-12 w-12 rounded-[10px] object-cover"
                          alt=""
                          {...profileImgAttrs}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = dicebearAvatarUrl(u.email || u.displayName || String(u.id)); }}
                        />
                        <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${live ? 'bg-emerald-400' : 'bg-white/30'}`} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{u.displayName || 'Anonymous'}</p>
                        <p className="text-xs text-muted truncate">{u.email}</p>
                      </div>
                      <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${live ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-white/50'}`}>
                        {live ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <dl className="mt-4 space-y-2 rounded-control bg-black/30 border border-white/10 p-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="flex items-center gap-1.5 text-muted"><Eye size={13} aria-hidden="true" /> Activity</dt>
                        <dd className="text-white truncate">{live ? (u.watching || 'Idle') : 'Not on the site'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="flex items-center gap-1.5 text-muted"><Clock size={13} aria-hidden="true" /> Last seen</dt>
                        <dd className="text-white">{lastSeenLabel(u, now)}</dd>
                      </div>
                      {u.deviceModel && (
                        <div className="flex justify-between gap-3">
                          <dt className="flex items-center gap-1.5 text-muted"><Monitor size={13} aria-hidden="true" /> Device</dt>
                          <dd className="text-white truncate">{u.deviceModel}</dd>
                        </div>
                      )}
                    </dl>
                    <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setPendingRemoval(u)} icon={<Power size={14} aria-hidden="true" />}>
                      Remove record
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* 7. FINAL CTA */}
      <section id="community" aria-labelledby="community-title" className={`${container} scroll-mt-20 py-24 lg:py-32 text-center`}>
        <Reveal className="flex flex-col items-center">
          <p className={`text-accent-text ${EYEBROW}`}>The next scene</p>
          <h2 id="community-title" className="mt-5 max-w-3xl text-4xl md:text-6xl font-semibold leading-[1.02] tracking-[-0.05em]">
            Your new favorite story is waiting.
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted">
            Join millions of film lovers discovering, discussing, and celebrating cinema every day.
          </p>
          <Button to="/" size="lg" className={`mt-9 ${EYEBROW} tracking-[0.2em]`} icon={null}>
            Start exploring <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </Reveal>
      </section>

      {/* SHOWREEL: a visual placeholder, not a video player (per the design doc) */}
      <Modal open={showreel} onClose={() => setShowreel(false)} labelledBy="showreel-title" className="max-w-5xl p-0! sm:p-0! bg-black! overflow-hidden">
        <div className="relative aspect-video w-full">
          <img src={HERO_IMG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-6">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-md">
              <Play size={22} className="ml-1 fill-white" aria-hidden="true" />
            </span>
            <p id="showreel-title" className={`text-white/80 ${EYEBROW}`}>MovieHub · Stories for everyone</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingRemoval}
        onClose={() => setPendingRemoval(null)}
        onConfirm={handleDeleteUser}
        loading={removing}
        title="Remove this visitor record?"
        message={`This deletes ${pendingRemoval?.displayName || 'this user'}'s activity record. It does not delete their account.`}
        confirmLabel="Remove"
      />
    </div>
  );
};

export default About;
