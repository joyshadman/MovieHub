import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../components/firebase';

// Visitor tracker. Every write goes to users/{uid} (the record the About admin panel lists).
// "Online" needs both the flag AND a recent heartbeat, so a tab that died without saying
// goodbye (crash, lost network, killed app) drops off by itself after ONLINE_WINDOW_MS.
export const HEARTBEAT_MS = 60 * 1000;
export const ONLINE_WINDOW_MS = 3 * 60 * 1000;

export const getDeviceModel = () => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Device';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'iOS Device';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Unknown Device';
};

export const getBrowser = () => {
  const ua = navigator.userAgent;
  if (navigator.brave) return 'Brave';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\/|FxiOS/.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS/.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other browser';
};

// Public IP address of this visitor, looked up once per tab session (ipify: free, no key, CORS open).
// Shown only in the owner's tracker on the About page.
const IP_KEY = 'mh:ip';
export const getIpAddress = async () => {
  try {
    const cached = sessionStorage.getItem(IP_KEY);
    if (cached) return cached;
  } catch { /* storage blocked: look it up */ }
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const ip = res.ok ? (await res.json())?.ip : null;
    if (ip) { try { sessionStorage.setItem(IP_KEY, ip); } catch { /* ignore */ } }
    return ip || null;
  } catch { return null; }
};

// Readable activity for a route, shown in the admin panel.
export const activityFor = (pathname = '/') => {
  if (pathname === '/') return 'Browsing Home';
  if (pathname === '/movies') return 'Browsing Movies';
  if (pathname === '/tv') return 'Browsing TV Shows';
  if (pathname === '/search') return 'Searching';
  if (pathname === '/mylist') return 'Viewing My List';
  if (pathname === '/about') return 'Reading About';
  if (pathname.startsWith('/categories')) return 'Browsing Categories';
  if (pathname.startsWith('/collection')) return 'Browsing a Collection';
  if (/^\/(movie|tv|details)\//.test(pathname)) return 'Viewing a title page';
  return `Browsing ${pathname}`;
};

export const writePresence = (user, fields = {}) => {
  if (!user?.uid) return Promise.resolve();
  return setDoc(
    doc(db, 'users', user.uid),
    {
      displayName: user.displayName || 'Anonymous',
      email: user.email || null,
      photoURL: user.photoURL || null,
      lastActive: serverTimestamp(),
      ...fields,
    },
    { merge: true }
  ).catch((err) => console.error('Presence update error:', err));
};

export const markOffline = (user) => writePresence(user, { isOnline: false });

// Admin side: is this record a live visitor right now?
export const isLive = (record, now = Date.now()) => {
  const seen = record?.lastActive?.toMillis?.();
  return !!record?.isOnline && !!seen && now - seen < ONLINE_WINDOW_MS;
};

export const lastSeenLabel = (record, now = Date.now()) => {
  const seen = record?.lastActive?.toMillis?.();
  if (!seen) return 'Syncing…';
  const mins = Math.floor((now - seen) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(seen).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
