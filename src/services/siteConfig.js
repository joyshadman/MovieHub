import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../components/firebase';

// Site wide switches in config/site (spec 0003). Everyone reads it live; only the owner writes it.
export const DEFAULT_MAINTENANCE_MESSAGE = 'MovieHub is getting some upgrades right now. Please check back soon.';

// MovieHub AI messages per user per UTC day (spec 0006). The server and the Firestore rule read
// the same field with the same default and clamp.
export const DEFAULT_AI_DAILY_LIMIT = 5;
export const clampAiLimit = (v) => (Number.isInteger(v) ? Math.min(50, Math.max(1, v)) : DEFAULT_AI_DAILY_LIMIT);

const siteRef = () => doc(db, 'config', 'site');

// Fails open: a missing doc, a rules error or being offline all mean "not in maintenance",
// so a mistake in the rules can never lock every visitor out.
export const subscribeSiteConfig = (cb) =>
  onSnapshot(
    siteRef(),
    (snap) => {
      const d = snap.exists() ? snap.data() : {};
      cb({ maintenance: d.maintenance === true, message: d.message || '', aiDailyLimit: clampAiLimit(d.aiDailyLimit), updatedAt: d.updatedAt || null, loaded: true });
    },
    (err) => {
      console.error('Site config read error:', err);
      cb({ maintenance: false, message: '', aiDailyLimit: DEFAULT_AI_DAILY_LIMIT, updatedAt: null, loaded: true });
    }
  );

export const saveSiteConfig = (user, { maintenance, message }) =>
  setDoc(siteRef(), {
    maintenance: !!maintenance,
    message: String(message || '').trim().slice(0, 500),
    updatedAt: Date.now(),
    updatedBy: user?.email || null,
  }, { merge: true });

export const saveAiDailyLimit = (user, limit) =>
  setDoc(siteRef(), {
    aiDailyLimit: clampAiLimit(Number(limit)),
    updatedAt: Date.now(),
    updatedBy: user?.email || null,
  }, { merge: true });
