import { deleteDoc, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { auth, db } from '../components/firebase';
import { movieApi } from './movieApi';

// MovieHub AI (spec 0006). The browser never sees the OpenRouter key: it calls our own
// /api/recommend with the viewer's Firebase sign in token, and the server enforces the limit.
const MAX_SAVED = 50; // messages kept in ai_chats/{uid}, oldest dropped first
const today = () => Math.floor(Date.now() / 86400000); // UTC day, same as the server

export class AiChatError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Messages used today, live (ai_usage/{uid}, written by the server only after an answer).
export const subscribeAiUsage = (uid, cb) =>
  onSnapshot(
    doc(db, 'ai_usage', uid),
    (snap) => {
      const d = snap.exists() ? snap.data() : null;
      cb(d && Number(d.day) === today() ? Number(d.count) || 0 : 0);
    },
    () => cb(null) // unreadable: the count just is not shown; the server still enforces it
  );

// The user's one saved chat, live, so it follows them across refreshes and devices.
const chatRef = (uid) => doc(db, 'ai_chats', uid);

export const subscribeAiChat = (uid, cb) =>
  onSnapshot(
    chatRef(uid),
    (snap) => cb(snap.exists() && Array.isArray(snap.data().messages) ? snap.data().messages : []),
    (err) => {
      console.error('AI chat read error:', err);
      cb([]);
    }
  );

// Firestore refuses `undefined`, so every saved field gets a real value.
const toSaved = (m) => ({
  role: m.role === 'assistant' ? 'assistant' : 'user',
  content: String(m.content || '').slice(0, 1000),
  at: m.at,
  ...(m.role === 'assistant' && m.picks?.length
    ? { picks: m.picks.slice(0, 6).map((p) => ({ id: p.id, type: p.type === 'tv' ? 'tv' : 'movie', title: p.title || '', year: p.year || null, image: p.image || null, rating: Number(p.rating) || 0, why: p.why || '' })) }
    : {}),
});

// One answered exchange, appended in a transaction so two tabs can not drop each other's messages.
export const saveAiTurn = (uid, question, answer) =>
  runTransaction(db, async (tx) => {
    const snap = await tx.get(chatRef(uid));
    const old = snap.exists() && Array.isArray(snap.data().messages) ? snap.data().messages : [];
    tx.set(chatRef(uid), { messages: [...old, toSaved(question), toSaved(answer)].slice(-MAX_SAVED), updatedAt: Date.now() });
  });

export const clearAiChat = (uid) => deleteDoc(chatRef(uid));

// A pick from the model becomes a real TMDB title, or is dropped.
const matchPick = async (pick) => {
  try {
    const { results = [] } = await movieApi.search(pick.title);
    const sameType = results.filter((r) => r.type === pick.type);
    const near = (r) => !pick.year || Math.abs(Number(r.year) - pick.year) <= 1;
    const hit = sameType.find(near) || results.find(near) || sameType[0];
    return hit ? { ...hit, why: pick.why } : null;
  } catch { return null; }
};

export const askAi = async ({ messages, profile }) => {
  const user = auth.currentUser;
  if (!user) throw new AiChatError('Sign in to chat with MovieHub AI.', 401);
  const token = await user.getIdToken();
  let res;
  try {
    res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages, profile }),
    });
  } catch {
    throw new AiChatError('Could not reach MovieHub AI. Check your connection.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AiChatError(data.error || 'MovieHub AI could not answer. Try again.', res.status, data.code);
  const seen = new Set();
  const picks = (await Promise.all((data.picks || []).map(matchPick)))
    .filter(Boolean)
    .filter((p) => { const k = `${p.type}:${p.id}`; if (seen.has(k)) return false; seen.add(k); return true; });
  return { reply: data.reply || '', picks };
};
