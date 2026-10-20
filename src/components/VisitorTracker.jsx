import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { AlertTriangle, Clock, Copy, Eye, Film, Globe, Monitor, Power, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from './firebase';
import { isLive, lastSeenLabel } from '../services/presence';
import { profileImgAttrs, dicebearAvatarUrl } from '../utils/avatarUrls';
import Button from './ui/Button';
import { ConfirmDialog } from './ui/Modal';
import { EmptyState } from './ui/feedback';

const SHOWN_TITLES = 4;
const fullDate = (ms) => (ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null);
const watchedLabel = (item) => (item.type === 'tv' && item.lastSeason ? `S${item.lastSeason} E${item.lastEpisode || 1}` : item.type === 'tv' ? 'Series' : 'Movie');

const Row = ({ icon, label, children, mono = false }) => {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-muted"><Icon size={13} aria-hidden="true" /> {label}</dt>
      <dd className={`min-w-0 truncate text-right text-white ${mono ? 'font-mono text-[11px]' : ''}`}>{children}</dd>
    </div>
  );
};

// One visitor: who, online state, last seen, IP, device, and what they watched.
const VisitorCard = ({ u, history, now, onRemove }) => {
  const [open, setOpen] = useState(false);
  const live = isLive(u, now);
  const seen = u.lastActive?.toMillis?.();
  const watched = [...history].sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0));
  const shown = open ? watched : watched.slice(0, SHOWN_TITLES);
  const copyIp = () => navigator.clipboard?.writeText(u.ip).then(() => toast.success('IP address copied'), () => {});

  return (
    <li className={`flex flex-col rounded-panel border bg-card p-5 motion-safe:transition-colors ${live ? 'border-emerald-400/30' : 'border-white/10'}`}>
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
          <p className="truncate text-sm font-semibold">{u.displayName || 'Anonymous'}</p>
          <p className="truncate text-xs text-muted">{u.email || 'No email'}</p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${live ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-white/50'}`}>
          {live ? 'Online' : 'Offline'}
        </span>
      </div>

      <dl className="mt-4 space-y-2 rounded-control border border-white/10 bg-black/30 p-3 text-xs">
        <Row icon={Eye} label="Now">{live ? (u.watching || 'Idle') : 'Not on the site'}</Row>
        <Row icon={Clock} label={live ? 'Last active' : 'Last online'}>
          <span title={fullDate(seen) || undefined}>{lastSeenLabel(u, now)}{seen && !live ? ` · ${fullDate(seen)}` : ''}</span>
        </Row>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex shrink-0 items-center gap-1.5 text-muted"><Globe size={13} aria-hidden="true" /> IP address</dt>
          <dd className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-mono text-[11px] text-white">{u.ip || 'Not recorded yet'}</span>
            {u.ip && (
              <button type="button" onClick={copyIp} aria-label={`Copy IP address ${u.ip}`} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white">
                <Copy size={12} aria-hidden="true" />
              </button>
            )}
          </dd>
        </div>
        <Row icon={Monitor} label="Device">{[u.deviceModel, u.browser].filter(Boolean).join(' · ') || 'Unknown'}</Row>
      </dl>

      <div className="mt-4 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
          <Film size={13} className="text-accent-text" aria-hidden="true" /> Watched · {watched.length}
        </p>
        {watched.length === 0 ? (
          <p className="mt-2 text-xs text-white/40">Nothing watched yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {shown.map((item) => (
              <li key={`${item.type}:${item.id}`} className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] p-1.5">
                {item.poster_path
                  ? <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt="" loading="lazy" className="h-10 w-7 shrink-0 rounded object-cover" />
                  : <span className="h-10 w-7 shrink-0 rounded bg-white/10" aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{item.title || item.name || 'Untitled'}</span>
                  <span className="block text-[11px] text-white/45">
                    {watchedLabel(item)}{item.watchedAt ? ` · ${fullDate(item.watchedAt)}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {watched.length > SHOWN_TITLES && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 text-xs font-semibold text-accent-text hover:underline">
            {open ? 'Show less' : `Show all ${watched.length}`}
          </button>
        )}
      </div>

      <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => onRemove(u)} icon={<Power size={14} aria-hidden="true" />}>
        Remove record
      </Button>
    </li>
  );
};

// Owner only (the Admin page renders it for the owner's account; Firestore rules must enforce the
// same): every signed in visitor with live status, IP, device, last online and watch history.
const VisitorTracker = ({ className = '' }) => {
  const [visitors, setVisitors] = useState([]);
  const [histories, setHistories] = useState({});
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState('');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('lastActive', 'desc')),
      (snap) => { setError(false); setVisitors(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); },
      (err) => { console.error('Visitor tracker error:', err); setError(true); }
    );
    const unsubHistory = onSnapshot(
      collection(db, 'history'),
      (snap) => setHistories(Object.fromEntries(snap.docs.map((d) => [d.id, d.data().items || []]))),
      (err) => console.error('Watch history read error:', err)
    );
    // "Online" depends on how long ago a visitor was seen, so re-check the clock regularly.
    const tick = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => { unsubUsers(); unsubHistory(); clearInterval(tick); };
  }, []);

  const onlineCount = visitors.filter((v) => isLive(v, now)).length;
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...visitors]
      .filter((v) => !onlyOnline || isLive(v, now))
      .filter((v) => !q || [v.displayName, v.email, v.ip, v.deviceModel, v.browser].some((f) => String(f || '').toLowerCase().includes(q)))
      .sort((a, b) => Number(isLive(b, now)) - Number(isLive(a, now)));
  }, [visitors, now, search, onlyOnline]);

  const handleRemove = async () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      await deleteDoc(doc(db, 'users', pendingRemoval.id));
      toast.success('Visitor record removed');
      setPendingRemoval(null);
    } catch {
      toast.error('Could not remove this record');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section id="tracker" aria-labelledby="tracker-title" className={className}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-text">Only visible to you</p>
          <h2 id="tracker-title" className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Visitor tracking</h2>
          <p className="mt-2 text-xs text-white/50">Signed in visitors. Online means seen in the last 3 minutes. Updates live.</p>
        </div>
        <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm" aria-live="polite">
          <Users size={16} aria-hidden="true" /> {visitors.length} total •
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden="true" /> {onlineCount} online
          </span>
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search visitors</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, IP or device"
            className="h-11 w-full rounded-control border border-line-strong bg-white/[0.06] pl-10 pr-4 text-sm focus:border-accent-text focus:outline-none"
          />
        </label>
        <div role="radiogroup" aria-label="Show" className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {[[false, 'Everyone'], [true, 'Online now']].map(([value, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={onlyOnline === value}
              onClick={() => setOnlyOnline(value)}
              className={`h-9 rounded-full px-4 text-sm font-medium motion-safe:transition-colors ${onlyOnline === value ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <EmptyState
          icon={<AlertTriangle size={26} aria-hidden="true" />}
          title="The tracker could not load"
          message="Firestore refused the read. Check that your account may read the users and history collections."
          className="py-10"
        />
      ) : shown.length === 0 ? (
        <EmptyState title={visitors.length ? 'No one matches' : 'No visitors yet'} message={visitors.length ? 'Try another search or show everyone.' : 'Signed in visitors will appear here.'} className="py-10" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((u) => <VisitorCard key={u.id} u={u} history={histories[u.id] || []} now={now} onRemove={setPendingRemoval} />)}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingRemoval}
        onClose={() => setPendingRemoval(null)}
        onConfirm={handleRemove}
        loading={removing}
        title="Remove this visitor record?"
        message={`This deletes ${pendingRemoval?.displayName || 'this user'}'s activity record. It does not delete their account or their watch history.`}
        confirmLabel="Remove"
      />
    </section>
  );
};

export default VisitorTracker;
