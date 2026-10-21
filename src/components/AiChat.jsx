import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Send, Sparkles, Star, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWatchlist } from '../context/WatchlistContext';
import { isOwner } from '../config/owner';
import { askAi, clearAiChat, saveAiTurn, subscribeAiChat, subscribeAiUsage } from '../services/aiChat';
import { DEFAULT_AI_DAILY_LIMIT } from '../services/siteConfig';
import { subscribeHistory } from '../services/watchHistory';
import { fallbackGradient } from '../utils/fallbackArt';
import Button from './ui/Button';
import { Spinner } from './ui/feedback';

const STARTERS = [
  'Something for me tonight',
  'A mind bending sci fi movie',
  'A funny series to binge',
  'Best Bangla movies',
  'Anime like Attack on Titan',
];

// One title the AI picked, matched to TMDB: opens its details page.
const PickCard = ({ pick, onOpen }) => (
  <li>
    <button type="button" onClick={() => onOpen(pick)} className="group flex w-full items-start gap-3 rounded-control border border-white/10 bg-white/[0.03] p-2 text-left hover:border-white/25 hover:bg-white/[0.07] motion-safe:transition-colors">
      {pick.image
        ? <img src={pick.image.replace('/w500', '/w185')} alt="" loading="lazy" className="h-[72px] w-12 shrink-0 rounded-md object-cover" />
        : <span className="h-[72px] w-12 shrink-0 rounded-md" style={{ backgroundImage: fallbackGradient(pick.id) }} aria-hidden="true" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white group-hover:text-accent-text">{pick.title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/50">
          {pick.year} · {pick.type === 'tv' ? 'Series' : 'Movie'}
          {pick.rating > 0 && <><Star size={10} className="fill-rating text-rating" aria-hidden="true" />{Number(pick.rating).toFixed(1)}</>}
        </span>
        {pick.why && <span className="mt-1 block text-xs leading-5 text-white/70 line-clamp-2">{pick.why}</span>}
      </span>
    </button>
  </li>
);

// MovieHub AI (spec 0006): a floating button and chat panel that only suggests movies and shows,
// shaped by what the viewer types, watched and saved. `limit` messages per user per UTC day (set on
// the Admin page); the owner is unlimited. App keys this by uid, so a new user starts clean.
const AiChat = ({ user, limit = DEFAULT_AI_DAILY_LIMIT }) => {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const watchlist = useWatchlist();
  const owner = isOwner(user);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(null); // ai_chats/{uid} messages; null until loaded
  const [local, setLocal] = useState([]); // this tab's not yet saved messages: in flight, or failed
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [used, setUsed] = useState(null);
  const [history, setHistory] = useState([]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!user || owner) return undefined;
    return subscribeAiUsage(user.uid, setUsed);
  }, [user, owner]);
  useEffect(() => {
    if (!user || !open) return undefined;
    return subscribeHistory(user.uid, setHistory);
  }, [user, open]);
  useEffect(() => {
    if (!user || !open) return undefined;
    return subscribeAiChat(user.uid, (msgs) => {
      setSaved(msgs);
      // Once a message is in the saved chat, drop this tab's copy of it.
      const inSaved = new Set(msgs.map((m) => `${m.role}:${m.at}`));
      setLocal((l) => l.filter((m) => !inSaved.has(`${m.role}:${m.at}`)));
    });
  }, [user, open]);

  const messages = useMemo(
    () => [...(saved || []), ...local].sort((a, b) => a.at - b.at),
    [saved, local]
  );

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, busy]);
  useEffect(() => { if (open && user) inputRef.current?.focus(); }, [open, user]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const remaining = owner || used === null ? null : Math.max(0, limit - used);
  const outOfMessages = remaining === 0;

  const ask = async (content) => {
    const question = content.trim();
    if (!question || busy || outOfMessages || saved === null) return;
    const q = { role: 'user', content: question, at: Date.now() };
    const convo = [...messages.filter((m) => !m.error), q];
    setLocal((l) => [...l, q]);
    setText('');
    setBusy(true);
    try {
      const profile = {
        watched: history.slice(0, 15).map((h) => `${h.title}${h.type === 'tv' ? ' (series)' : ''}`),
        saved: (watchlist?.items || []).slice(0, 15).map((i) => i.title || i.name).filter(Boolean),
      };
      const answer = await askAi({ messages: convo.map((m) => ({ role: m.role, content: m.content })), profile });
      const a = { role: 'assistant', content: answer.reply, picks: answer.picks, at: Date.now() };
      setLocal((l) => [...l, a]);
      saveAiTurn(user.uid, q, a).catch((err) => {
        console.error('Save AI chat:', err);
        toast.error('Could not save this chat. It will be gone after a refresh.');
      });
    } catch (err) {
      // Shown here but never saved, and never counted by the server.
      setLocal((l) => [...l, { role: 'assistant', content: err.message, error: true, at: Date.now() }]);
    } finally {
      setBusy(false);
    }
  };

  const clearChat = async () => {
    try {
      await clearAiChat(user.uid);
      setLocal([]);
      setConfirmClear(false);
    } catch (err) {
      console.error('Clear AI chat:', err);
      toast.error('Could not clear the chat. Try again.');
    }
  };

  const openPick = (p) => {
    setOpen(false);
    navigate(`/${p.type}/${p.id}`);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <Motion.button
            key="ai-fab"
            type="button"
            initial={reduce ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            data-tour="ai"
            className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+84px)] md:bottom-6 md:right-6 z-[120] inline-flex h-12 items-center gap-2 rounded-full bg-accent pl-4 pr-5 font-body text-sm font-semibold text-white shadow-glow hover:bg-accent-hover motion-safe:transition-colors"
          >
            <Sparkles size={18} aria-hidden="true" /> Ask AI
          </Motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <Motion.section
            key="ai-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="ai-chat-title"
            initial={reduce ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[140] flex flex-col overflow-hidden border border-white/10 bg-[#0d0d12]/95 font-body text-white shadow-card backdrop-blur-xl inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+76px)] top-20 rounded-panel md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:h-[min(640px,calc(100vh-120px))] md:w-[400px]"
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <h2 id="ai-chat-title" className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-accent-text" aria-hidden="true" /> MovieHub AI</h2>
                <p className="text-[11px] text-white/45">
                  {owner ? 'Unlimited' : user && remaining !== null ? `${remaining} of ${limit} messages left today` : 'Movie and series picks for you'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {user && messages.length > 0 && (
                  <button type="button" onClick={() => setConfirmClear(true)} disabled={busy} aria-label="Clear chat" title="Clear chat" className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"><Trash2 size={16} aria-hidden="true" /></button>
                )}
                <button type="button" onClick={() => setOpen(false)} aria-label="Close MovieHub AI" className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><X size={18} aria-hidden="true" /></button>
              </div>
            </header>

            {confirmClear && (
              <div role="alertdialog" aria-labelledby="ai-clear-title" className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-accent/10 px-4 py-2.5">
                <p id="ai-clear-title" className="text-xs text-white/85">Clear this chat on every device?</p>
                <div className="flex gap-2">
                  <button type="button" autoFocus onClick={() => setConfirmClear(false)} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/85 hover:bg-white/10">Cancel</button>
                  <button type="button" onClick={clearChat} className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent-hover">Clear chat</button>
                </div>
              </div>
            )}

            {!user ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <Sparkles size={28} className="text-accent-text" aria-hidden="true" />
                <p className="text-sm text-white/75">Sign in to get movie and series picks based on what you watch and save.</p>
                <Button to="/login" state={{ from: location.pathname }} icon={<LogIn size={16} aria-hidden="true" />} onClick={() => setOpen(false)}>Sign in</Button>
              </div>
            ) : (
              <>
                <ol ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
                  {saved === null && <li className="flex items-center gap-2 text-xs text-white/50"><Spinner size={16} /> Loading your chat…</li>}
                  {saved !== null && messages.length === 0 && (
                    <li className="space-y-3">
                      <p className="text-sm leading-6 text-white/75">Tell me what you are in the mood for. I know what you watched and saved, so “something for me” works too. I only talk movies and shows.</p>
                      <div className="flex flex-wrap gap-2">
                        {STARTERS.map((s) => (
                          <button key={s} type="button" disabled={outOfMessages} onClick={() => ask(s)} className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-white/85 hover:border-white/30 hover:bg-white/10 disabled:opacity-40">{s}</button>
                        ))}
                      </div>
                    </li>
                  )}
                  {messages.map((m) => (
                    <li key={`${m.role}:${m.at}`} className={m.role === 'user' ? 'flex justify-end' : ''}>
                      {m.role === 'user' ? (
                        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm leading-6 break-words">{m.content}</p>
                      ) : (
                        <div className="space-y-2.5">
                          <p className={`text-sm leading-6 break-words ${m.error ? 'text-accent-text' : 'text-white/90'}`}>{m.content}</p>
                          {m.picks?.length > 0 && (
                            <ul className="space-y-2" aria-label="Picks">
                              {m.picks.map((p) => <PickCard key={`${p.type}:${p.id}`} pick={p} onOpen={openPick} />)}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                  {busy && <li className="flex items-center gap-2 text-xs text-white/50"><Spinner size={16} /> Finding picks…</li>}
                </ol>

                <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex items-center gap-2 border-t border-white/10 px-3 py-3">
                  <label htmlFor="ai-chat-input" className="sr-only">Ask for a movie or series</label>
                  <input
                    id="ai-chat-input"
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={1000}
                    autoComplete="off"
                    disabled={outOfMessages}
                    placeholder={outOfMessages ? `Used all ${limit} for today. Back at midnight UTC.` : 'Ask for a movie or series'}
                    className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-white/[0.06] px-4 text-sm placeholder:text-white/35 focus:outline-none focus:border-accent-text disabled:opacity-60"
                  />
                  <button type="submit" disabled={busy || outOfMessages || !text.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"><Send size={16} aria-hidden="true" /></button>
                </form>
              </>
            )}
          </Motion.section>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiChat;
